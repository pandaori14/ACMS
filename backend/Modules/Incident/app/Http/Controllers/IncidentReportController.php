<?php

namespace Modules\Incident\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\SystemReference;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Incident\Http\Requests\StoreIncidentNoteRequest;
use Modules\Incident\Http\Requests\StoreIncidentRequest;
use Modules\Incident\Http\Requests\UpdateIncidentStatusRequest;
use Modules\Incident\Http\Resources\IncidentReportResource;
use Modules\Incident\Services\IncidentFormService;
use Modules\Incident\Services\IncidentService;

class IncidentReportController extends Controller
{
    public function __construct(
        private readonly IncidentService $incidentService,
        private readonly IncidentFormService $formService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $paginated = $this->incidentService->list($request->all(), $request->user());

        return response()->json([
            'data' => IncidentReportResource::collection(collect($paginated->items()))->resolve($request),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Opsi form pelaporan untuk SEMUA pelapor terotentikasi (OPERATE).
     * Hanya item aktif. Tidak di-gate manage-settings sehingga konfigurasi
     * Super Admin/Admin Prodi benar-benar sampai ke mahasiswa.
     */
    public function formOptions(): JsonResponse
    {
        $byCategory = fn (string $category) => SystemReference::where('category', $category)
            ->where('is_active', true)
            ->orderBy('created_at')
            ->get(['value', 'name'])
            ->toArray();

        // Template aktif per jenis insiden (sections + fields)
        $templatesMap = $this->formService->activeTemplatesMap();
        $formTemplates = [];
        foreach ($templatesMap as $type => $template) {
            $formTemplates[$type] = [
                'id' => $template->id,
                'name' => $template->name,
                'header_title' => $template->header_title,
                'header_subtitle' => $template->header_subtitle,
                'theme_color' => $template->theme_color,
                'version' => $template->version,
                'sections' => $template->sections->map(fn ($s) => [
                    'id' => $s->id,
                    'title' => $s->title,
                    'icon' => $s->icon,
                    'description' => $s->description,
                    'sort_order' => $s->sort_order,
                    'is_visible' => $s->is_visible,
                    'conditional_field_id' => $s->conditional_field_id,
                    'conditional_value' => $s->conditional_value,
                    'fields' => $s->fields->map(fn ($f) => [
                        'id' => $f->id,
                        'label' => $f->label,
                        'field_key' => $f->field_key,
                        'field_type' => $f->field_type,
                        'placeholder' => $f->placeholder,
                        'help_text' => $f->help_text,
                        'is_required' => $f->is_required,
                        'sort_order' => $f->sort_order,
                        'options' => $f->options,
                        'validation_rules' => $f->validation_rules,
                        'grid_cols' => $f->grid_cols,
                    ])->toArray(),
                ])->toArray(),
            ];
        }

        return response()->json([
            'data' => [
                'incident_types' => $byCategory('incident_types'),
                'incident_severities' => $byCategory('incident_severities'),
                'attachment' => [
                    'max_size_mb' => (int) Setting::getValue('incident_max_attachment_size_mb', 10),
                    'allowed_types' => (string) Setting::getValue('incident_allowed_attachment_types', 'jpg,jpeg,png,pdf,doc,docx'),
                ],
                'form_templates' => $formTemplates,
            ],
        ]);
    }

    public function store(StoreIncidentRequest $request): JsonResponse
    {
        $report = $this->incidentService->store(
            $request->validated(),
            $request->file('attachment'),
            $request->user()
        );

        // Simpan jawaban form dinamis jika ada template aktif
        $formAnswers = $request->input('form_answers', []);
        $templateId = $request->input('form_template_id');

        if ($templateId && ! empty($formAnswers)) {
            $template = $this->formService->activeTemplateForType($report->incident_type);

            if ($template && $template->id === $templateId) {
                // Kumpulkan file uploads dari form_files[field_key]
                $files = [];
                if ($request->hasFile('form_files')) {
                    foreach ($request->file('form_files') as $key => $file) {
                        $files[$key] = $file;
                    }
                }

                $this->formService->saveFormResponse($report, $template, $formAnswers, $files);
            }
        }

        return response()->json([
            'message' => 'Laporan insiden berhasil dikirim. Terima kasih atas partisipasi Anda dalam menjaga keamanan lingkungan klinis.',
            'data' => (new IncidentReportResource($report))->resolve($request),
        ], 201);
    }

    public function show(string $id, Request $request): JsonResponse
    {
        $report = $this->incidentService->show($id, $request->user());

        return response()->json(['data' => (new IncidentReportResource($report))->resolve($request)]);
    }

    public function updateStatus(UpdateIncidentStatusRequest $request, string $id): JsonResponse
    {
        $report = $this->incidentService->updateStatus(
            $id,
            $request->validated('status'),
            $request->validated('resolution_notes'),
            $request->user()
        );

        return response()->json([
            'message' => 'Status laporan berhasil diperbarui.',
            'data' => (new IncidentReportResource($report))->resolve($request),
        ]);
    }

    public function notes(string $id, Request $request): JsonResponse
    {
        $report = $this->incidentService->show($id, $request->user());

        return response()->json(['data' => $report->notes]);
    }

    public function addNote(StoreIncidentNoteRequest $request, string $id): JsonResponse
    {
        $note = $this->incidentService->addNote(
            $id,
            $request->validated('note'),
            (bool) $request->validated('is_internal', true),
            $request->user()
        );

        return response()->json([
            'message' => 'Catatan berhasil ditambahkan.',
            'data' => $note->load('author:id,name'),
        ], 201);
    }

    public function statistics(Request $request): JsonResponse
    {
        $stats = $this->incidentService->statistics($request->user());

        return response()->json(['data' => $stats]);
    }

    /**
     * Ekspor PDF statistik insiden — data & scoping sama dgn statistics().
     */
    public function statisticsExport(Request $request)
    {
        $stats = $this->incidentService->statistics($request->user());

        $pdf = Pdf::loadView('incident::pdf.statistics', [
            'stats' => $stats,
            'generatedAt' => now(),
        ]);

        return $pdf->download('Statistik_Insiden_'.now()->format('Ymd').'.pdf');
    }

    public function downloadAttachment(string $id, Request $request)
    {
        $info = $this->incidentService->downloadAttachment($id, $request->user());

        return response()->download($info['path'], $info['filename']);
    }
}
