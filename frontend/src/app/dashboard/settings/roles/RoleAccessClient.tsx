"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-helpers";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save } from "lucide-react";

interface Role {
  id: string | number;
  name: string;
  permissions: { id: string | number; name: string }[];
}

interface Permission {
  id: string | number;
  name: string;
}

/**
 * Pemetaan permission → modul (selaras dengan grup navigasi sidebar).
 * Dipakai untuk mengelompokkan & memfokuskan matriks RBAC per modul.
 * "Keamanan & Laporan" ditaruh pertama karena modul yang sedang dikerjakan.
 * Label grup diambil dari katalog i18n: settingsRoles.groups.*
 */
const MODULE_GROUPS: { key: string; permissions: string[] }[] = [
  {
    key: "securityReports",
    permissions: [
      "report-incidents",
      "configure-incident-form",
      "manage-incidents",
      "view-anonymous-identity",
      "submit-consultation",
      "manage-consultations",
      "view-incident-guide",
    ],
  },
  { key: "main", permissions: ["view-dashboard", "view-analytics"] },
  {
    key: "academicClinical",
    permissions: [
      "manage-stase",
      "manage-hospitals",
      "view-rotations",
      "manage-rotations",
      "view-logbook",
      "verify-logbook",
      "view-attendance-recap",
    ],
  },
  {
    key: "assessmentEvaluation",
    permissions: [
      "take-examinations",
      "manage-examinations",
      "create-assessments",
      "view-assessments",
      "manage-grades",
      "view-transcripts",
    ],
  },
  { key: "finance", permissions: ["manage-finance"] },
  {
    key: "systemMasterData",
    permissions: ["manage-users", "manage-academic-master", "manage-settings", "view-audit-logs"],
  },
];

const DEFAULT_FOCUS = "securityReports";

export function RoleAccessClient() {
  const t = useTranslations("settingsRoles");
  const tc = useTranslations("common");
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState<string>(DEFAULT_FOCUS);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sekali saat mount
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get("/api/role-permissions");
      setRoles(res.data.roles);
      setPermissions(res.data.permissions);
    } catch (error) {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  };

  /**
   * Kelompokkan permission yang benar-benar ada (dari backend) ke dalam modul.
   * Permission yang tidak terpetakan masuk grup "other" (Lainnya).
   */
  const groupedPermissions = useMemo(() => {
    const existingNames = new Set(permissions.map((p) => p.name));
    const byName = new Map(permissions.map((p) => [p.name, p]));
    const claimed = new Set<string>();

    const groups = MODULE_GROUPS.map((group) => {
      const perms = group.permissions
        .filter((name) => existingNames.has(name))
        .map((name) => {
          claimed.add(name);
          return byName.get(name)!;
        });
      return { key: group.key, permissions: perms };
    }).filter((g) => g.permissions.length > 0);

    const leftovers = permissions.filter((p) => !claimed.has(p.name));
    if (leftovers.length > 0) {
      groups.push({ key: "other", permissions: leftovers });
    }

    return groups;
  }, [permissions]);

  const visibleGroups = useMemo(() => {
    if (moduleFilter === "all") return groupedPermissions;
    return groupedPermissions.filter((g) => g.key === moduleFilter);
  }, [groupedPermissions, moduleFilter]);

  const hasPermission = (role: Role, permName: string) => {
    return role.permissions.some((p) => p.name === permName);
  };

  const togglePermission = (roleId: string | number, permName: string, checked: boolean) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.id === roleId) {
          if (checked) {
            return { ...r, permissions: [...r.permissions, { id: 0, name: permName }] };
          } else {
            return { ...r, permissions: r.permissions.filter((p) => p.name !== permName) };
          }
        }
        return r;
      })
    );
  };

  const handleSave = async (role: Role) => {
    setSaving(role.id.toString());
    try {
      const permNames = role.permissions.map((p) => p.name);
      await api.post(`/api/role-permissions/${role.id}/sync`, { permissions: permNames });
      toast.success(t("updateSuccess", { role: role.name }));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("updateError", { role: role.name })));
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="p-6">{t("loadingMatrix")}</div>;

  const totalVisible = visibleGroups.reduce((sum, g) => sum + g.permissions.length, 0);

  return (
    <div className="p-6 max-w-full overflow-x-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("subtitle")}
        </p>
      </div>

      {/* Filter Fokus Modul */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground">{t("focusModule")}</span>
        <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v ?? DEFAULT_FOCUS)}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder={t("selectModule")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allModules")}</SelectItem>
            {groupedPermissions.map((g) => (
              <SelectItem key={g.key} value={g.key}>
                {t(`groups.${g.key}`)} ({g.permissions.length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {t("showingPermissions", { count: totalVisible })}
          {moduleFilter !== "all" && t("focusSuffix")}
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b">
            <tr>
              <th className="px-4 py-3 font-semibold whitespace-nowrap min-w-[200px] border-r bg-slate-100 dark:bg-slate-800 sticky left-0 z-10">
                {t("moduleMenu")}
              </th>
              {roles.map((role) => (
                <th key={role.id} className="px-4 py-3 font-semibold text-center whitespace-nowrap min-w-[150px]">
                  {role.name}
                  <div className="mt-2 font-normal">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs w-full"
                      onClick={() => handleSave(role)}
                      disabled={saving === role.id.toString() || role.name === "Super Admin"}
                    >
                      {saving === role.id.toString() ? tc("saving") : (
                        <><Save className="w-3 h-3 mr-1" /> {tc("save")}</>
                      )}
                    </Button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {visibleGroups.map((group) => (
              <FragmentGroup
                key={group.key}
                group={group}
                label={t(`groups.${group.key}`)}
                roles={roles}
                showHeader={moduleFilter === "all"}
                hasPermission={hasPermission}
                togglePermission={togglePermission}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface FragmentGroupProps {
  group: { key: string; permissions: Permission[] };
  label: string;
  roles: Role[];
  showHeader: boolean;
  hasPermission: (role: Role, permName: string) => boolean;
  togglePermission: (roleId: string | number, permName: string, checked: boolean) => void;
}

function FragmentGroup({ group, label, roles, showHeader, hasPermission, togglePermission }: FragmentGroupProps) {
  return (
    <>
      {showHeader && (
        <tr className="bg-slate-100/70 dark:bg-slate-800/70">
          <td
            colSpan={roles.length + 1}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 sticky left-0"
          >
            {label}
          </td>
        </tr>
      )}
      {group.permissions.map((perm) => (
        <tr key={perm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
          <td className="px-4 py-3 font-medium border-r bg-white dark:bg-slate-900 sticky left-0 z-10">
            <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
              {perm.name}
            </span>
          </td>
          {roles.map((role) => {
            const isSuperAdmin = role.name === "Super Admin";
            return (
              <td key={`${role.id}-${perm.id}`} className="px-4 py-3 text-center">
                <Checkbox
                  checked={hasPermission(role, perm.name)}
                  disabled={isSuperAdmin}
                  onCheckedChange={(checked) => togglePermission(role.id, perm.name, checked as boolean)}
                  className={isSuperAdmin ? "opacity-50 cursor-not-allowed" : ""}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
