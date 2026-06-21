<?php

namespace Modules\Incident\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\SystemReference;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Incident\Http\Requests\RespondConsultationRequest;
use Modules\Incident\Http\Requests\StoreConsultationRequest;
use Modules\Incident\Http\Resources\ConsultationResource;
use Modules\Incident\Services\ConsultationService;

class ConsultationController extends Controller
{
    public function __construct(private readonly ConsultationService $consultationService) {}

    /**
     * Opsi form konsultasi (kategori aktif) untuk semua pengaju terotentikasi.
     * Tidak di-gate manage-settings agar dropdown dinamis sampai ke mahasiswa.
     */
    public function formOptions(): JsonResponse
    {
        $categories = SystemReference::where('category', 'consultation_categories')
            ->where('is_active', true)
            ->orderBy('created_at')
            ->get(['value', 'name'])
            ->toArray();

        return response()->json(['data' => ['categories' => $categories]]);
    }

    public function index(Request $request): JsonResponse
    {
        $paginated = $this->consultationService->list($request->all(), $request->user());

        return response()->json([
            'data' => ConsultationResource::collection(collect($paginated->items()))->resolve($request),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    public function store(StoreConsultationRequest $request): JsonResponse
    {
        $consultation = $this->consultationService->store(
            $request->validated(),
            $request->user()
        );

        return response()->json([
            'message' => 'Konsultasi berhasil dikirim. Kami akan segera merespons permintaan Anda.',
            'data' => (new ConsultationResource($consultation))->resolve($request),
        ], 201);
    }

    public function show(string $id, Request $request): JsonResponse
    {
        $consultation = $this->consultationService->show($id, $request->user());

        return response()->json(['data' => (new ConsultationResource($consultation))->resolve($request)]);
    }

    public function respond(RespondConsultationRequest $request, string $id): JsonResponse
    {
        $consultation = $this->consultationService->respond(
            $id,
            $request->validated('response'),
            $request->validated('status'),
            $request->user()
        );

        return response()->json([
            'message' => 'Respons konsultasi berhasil disimpan.',
            'data' => (new ConsultationResource($consultation))->resolve($request),
        ]);
    }
}
