<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\AuditLog;
use App\Models\Setting;
use App\Services\AuditService;
use Illuminate\Http\Request;

/**
 * Read-only access to the audit trail.
 *
 * Scope (AUDIT_TRAIL_SPEC.md §10): Super Admin sees everything; everyone else with
 * the `view-audit-logs` permission (Kaprodi) is restricted to their own program.
 * Every browse/inspect is itself audited ("who watches the watchers").
 */
class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = AuditLog::query()->with('actor:id,name,email')->orderByDesc('created_at');

        if (! $user->hasRole('Super Admin')) {
            $query->where('program_id', $user->program_id);
        }

        foreach (['action', 'target_type', 'actor_id', 'program_id'] as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->input($field));
            }
        }

        if ($request->filled('from')) {
            $query->where('created_at', '>=', $request->date('from'));
        }
        if ($request->filled('to')) {
            $query->where('created_at', '<=', $request->date('to'));
        }
        if ($request->filled('q')) {
            $term = '%'.$request->input('q').'%';
            $query->where(function ($sub) use ($term) {
                $sub->where('action', 'like', $term)
                    ->orWhere('target_type', 'like', $term)
                    ->orWhere('target_id', 'like', $term);
            });
        }

        $defaultPerPage = (int) Setting::getValue('items_per_page', 20);
        $perPage = min((int) $request->input('per_page', $defaultPerPage ?: 20), 100);
        $logs = $query->paginate($perPage);

        // Meta-audit: record this inspection (runs after response).
        AuditService::log('audit.viewed', null, [], [], [
            'filters' => $request->only(['action', 'target_type', 'actor_id', 'from', 'to', 'q']),
            'rows_returned' => $logs->total(),
        ]);

        return AuditLogResource::collection($logs);
    }

    public function show(Request $request, string $auditLog)
    {
        $user = $request->user();

        $query = AuditLog::query()->with('actor:id,name,email');

        if (! $user->hasRole('Super Admin')) {
            $query->where('program_id', $user->program_id);
        }

        $log = $query->findOrFail($auditLog);

        AuditService::log('audit.viewed', $log, [], [], ['view' => 'detail']);

        return new AuditLogResource($log);
    }
}
