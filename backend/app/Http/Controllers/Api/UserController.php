<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = User::query()->with(['program', 'hospitals', 'roles']);

        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('identity_number', 'like', "%{$search}%");
            });
        }

        if ($request->has('role') && $request->role) {
            $query->role($request->role);
        }

        $users = $query->paginate($request->per_page ?? 15);

        return UserResource::collection($users);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(UserRequest $request): JsonResponse
    {
        $data = $request->validated();
        $data['password'] = Hash::make($data['password']);

        $user = User::create($data);

        $user->syncRoles($request->roles);

        if ($request->has('hospital_ids')) {
            $user->hospitals()->sync($request->hospital_ids);
        }

        // Send Notification Email if enabled
        NotificationService::sendDynamicEmail(
            $user->email,
            'Selamat Datang di ACMS',
            'email_template_welcome',
            'new_account',
            [
                'name' => $user->name,
                'email' => $user->email,
                'password' => $request->password, // Unhashed password since we just created it
                'link' => url('/login'),
            ]
        );

        return response()->json([
            'message' => 'Pengguna berhasil ditambahkan.',
            'data' => new UserResource($user->load(['program', 'hospitals', 'roles'])),
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user): UserResource
    {
        return new UserResource($user->load(['program', 'hospitals', 'roles']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();

        if (isset($data['password']) && ! empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        $user->update($data);

        if ($request->has('roles')) {
            $user->syncRoles($request->roles);
        }

        if ($request->has('hospital_ids')) {
            $user->hospitals()->sync($request->hospital_ids);
        }

        return response()->json([
            'message' => 'Pengguna berhasil diperbarui.',
            'data' => new UserResource($user->load(['program', 'hospitals', 'roles'])),
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json([
            'message' => 'Pengguna berhasil dihapus.',
        ]);
    }
}
