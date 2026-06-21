<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionController extends Controller
{
    /**
     * Get matrix of roles and permissions
     */
    public function index(Request $request): JsonResponse
    {
        // Only super admin can manage this
        if (! $request->user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Force clear cache to ensure we get the latest permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();
        $roles = Role::with('permissions')->get();
        $permissions = Permission::all();

        return response()->json([
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Sync permissions for a specific role
     */
    public function sync(Request $request, $roleId): JsonResponse
    {
        if (! $request->user()->hasRole('Super Admin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        $role = Role::findOrFail($roleId);

        // Cannot modify Super Admin to prevent lockout
        if ($role->name === 'Super Admin') {
            return response()->json(['message' => 'Super Admin permissions cannot be modified'], 403);
        }

        $role->syncPermissions($request->permissions);

        return response()->json([
            'message' => 'Permissions synchronized successfully',
            'role' => $role->load('permissions'),
        ]);
    }
}
