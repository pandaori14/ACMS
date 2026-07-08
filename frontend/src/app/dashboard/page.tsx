"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/useAuthStore";
import api from "@/lib/api";
import { getApiErrorStatus } from "@/lib/api-helpers";
import { RotationAssignment, StaseGrade } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Building2, BookOpen, Clock, Activity, GraduationCap, Building, ClipboardList, CheckCircle, ShieldAlert } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { useQuery } from "@tanstack/react-query";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const t = useTranslations("dashHome");

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ['dashboard_stats'],
    queryFn: async () => {
      try {
        const res = await api.get("/api/dashboard/stats");
        return res.data;
      } catch (err) {
        if (getApiErrorStatus(err) === 401) {
          router.push("/login");
        }
        throw err;
      }
    }
  });



  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t("title")}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </div>
    );
  }

  // --- ADMIN VIEW ---
  if (stats?.role === "Admin") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {t("adminTitle")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t.rich("adminWelcome", { b: (c) => <span className="font-medium text-slate-900 dark:text-slate-300">{c}</span>, name: user?.name ?? "" })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("totalStudents")}</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{stats.metrics.total_students}</div>
              <p className="text-xs text-slate-500 mt-1">{t("registered")}</p>
            </CardContent>
          </Card>
          
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("activeStase")}</CardTitle>
              <BookOpen className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{stats.metrics.total_stase}</div>
              <p className="text-xs text-slate-500 mt-1">{t("runningDept")}</p>
            </CardContent>
          </Card>
          
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("affiliatedHospitals")}</CardTitle>
              <Building2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{stats.metrics.total_hospitals}</div>
              <p className="text-xs text-slate-500 mt-1">{t("activeHospitals")}</p>
            </CardContent>
          </Card>
          
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("runningRotations")}</CardTitle>
              <Activity className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{stats.metrics.active_rotations}</div>
              <p className="text-xs text-slate-500 mt-1">{t("currentAssignments")}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="col-span-1 clean-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("distByStase")}</CardTitle>
              <CardDescription className="text-xs">{t("distByStaseSub")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.stase_distribution?.length === 0 ? (
                  <p className="text-sm text-slate-500">{t("noActiveStase")}</p>
                ) : (
                  stats.stase_distribution?.map((item: { name?: string; value?: number }, i: number) => (
                    <div key={i} className="flex items-center group">
                      <div className="w-[180px] truncate text-sm font-medium text-slate-700 dark:text-slate-300">{item.name}</div>
                      <div className="flex-1 ml-4">
                        <Progress value={((item.value ?? 0) / stats.metrics.active_rotations) * 100} className="h-2 bg-slate-100 dark:bg-slate-800" />
                      </div>
                      <div className="ml-4 w-8 text-right text-sm text-slate-500">{item.value}</div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 flex flex-col clean-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("distByHospital")}</CardTitle>
              <CardDescription className="text-xs">{t("distByHospitalSub")}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[300px]">
              {stats.hospital_distribution?.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-slate-500">{t("noHospitalDist")}</p>
                </div>
              ) : (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.hospital_distribution} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12, fill: '#64748b' }} 
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: '#64748b' }}
                      />
                      <Tooltip
                        cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }}
                        contentStyle={{ 
                          borderRadius: '6px', 
                          border: '1px solid #e2e8f0', 
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                          backgroundColor: '#ffffff',
                          fontSize: '12px',
                          color: '#0f172a'
                        }}
                      />
                      <Bar 
                        dataKey="total" 
                        fill="#0f172a" 
                        radius={[4, 4, 0, 0]}
                        name={t("studentCount")}
                        animationDuration={1000}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {stats.logbook_trend && (
          <Card className="clean-card mt-4">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{t("logbookTrend")}</CardTitle>
              <CardDescription className="text-xs">{t("logbookTrendSub")}</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.logbook_trend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '6px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="total" name={t("logbookCreated")} stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // --- PRECEPTOR VIEW ---
  if (stats?.role === "Preceptor") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            {t("preceptorTitle")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t.rich("preceptorWelcome", { b: (c) => <span className="font-medium text-slate-900 dark:text-slate-300">{c}</span>, name: user?.name ?? "" })}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("supervisedStudents")}</CardTitle>
              <Users className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-slate-900 dark:text-slate-50">{stats.active_students_count}</div>
              <p className="text-sm text-slate-500 mt-1">{t("supervisedSub")}</p>
            </CardContent>
          </Card>

          <Card className="clean-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{t("awaitingVerification")}</CardTitle>
              <ClipboardList className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold text-slate-900 dark:text-slate-50">{stats.pending_logbooks}</div>
              <p className="text-sm text-slate-500 mt-1">{t("awaitingVerificationSub")}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="clean-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t("activeStudentList")}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.active_students?.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                <p className="text-slate-500 text-sm">{t("noAssignedStudents")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.active_students?.map((assignment: RotationAssignment) => (
                  <div key={assignment.id} className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="bg-slate-200 dark:bg-slate-800 p-2 rounded-full">
                        <GraduationCap className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-50">{assignment.student?.name}</p>
                        <p className="text-sm text-slate-500">{assignment.stase?.name}</p>
                      </div>
                    </div>
                    <div className="text-sm text-right">
                      <p className="text-xs text-slate-500">{t("completedOn")}</p>
                      <p className="font-medium text-slate-700 dark:text-slate-300">{new Date(assignment.rotation_period?.end_date ?? "").toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- STUDENT OR GENERAL USER VIEW ---
  const hasRotationsAccess = user?.permissions?.includes('view-rotations');
  const hasIncidentsAccess = user?.permissions?.includes('report-incidents') || user?.permissions?.includes('manage-incidents');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {t("academicClinic")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {t.rich("welcomeBack", { b: (c) => <span className="font-medium text-slate-900 dark:text-slate-300">{c}</span>, name: user?.name ?? "" })}
        </p>
      </div>

      {!hasRotationsAccess && hasIncidentsAccess ? (
        <Card className="clean-card border-none bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-indigo-900 opacity-20 blur-3xl"></div>
          
          <CardContent className="flex flex-col md:flex-row items-center justify-between p-8 md:p-12 relative z-10">
            <div className="mb-6 md:mb-0 space-y-5">
              <div className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-sm font-medium text-white ring-1 ring-inset ring-white/20 backdrop-blur-sm">
                {t("incidentModule")}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                {t("incidentSystem")}
              </h2>
              <p className="text-indigo-100 max-w-lg text-lg leading-relaxed">
                {t("incidentBlurb")}
              </p>
              <div className="flex gap-4 pt-2">
                <Button onClick={() => router.push('/dashboard/incidents/report')} className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold shadow-lg border-0 transition-all hover:scale-105">
                  {t("reportNewIncident")}
                </Button>
                {user?.permissions?.includes('view-incident-guide') && (
                  <Button variant="outline" onClick={() => router.push('/dashboard/safety/guide')} className="bg-transparent text-white border-white hover:bg-white/10 transition-all">
                    {t("readGuide")}
                  </Button>
                )}
              </div>
            </div>
            <div className="p-8 bg-white/10 rounded-full ring-8 ring-white/5 backdrop-blur-md transform transition-transform hover:scale-110 hover:rotate-3 duration-500 hidden md:flex">
              <ShieldAlert className="h-28 w-28 text-white opacity-95 drop-shadow-md" />
            </div>
          </CardContent>
        </Card>
      ) : !stats?.active_assignment && hasRotationsAccess ? (
        <Card className="clean-card border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t("noActiveRotation")}</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">{t("noActiveRotationSub")}</p>
          </CardContent>
        </Card>
      ) : !hasRotationsAccess && !hasIncidentsAccess ? (
        <Card className="clean-card border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t("limitedAccess")}</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md">{t("limitedAccessSub")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 clean-card">
              <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800">
                <CardDescription className="text-xs font-semibold tracking-wide uppercase text-slate-500">{t("currentStase")}</CardDescription>
                <CardTitle className="text-2xl mt-1">{stats.active_assignment.stase?.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium">{stats.active_assignment.hospital?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-sm">{t("preceptorLabel", { name: stats.active_assignment.preceptor?.name ?? "" })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-500">
                      {new Date(stats.active_assignment.rotation_period?.start_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})} &mdash; {new Date(stats.active_assignment.rotation_period?.end_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between clean-card">
              <CardHeader className="pb-2 border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-base font-semibold">{t("logbookProgress")}</CardTitle>
                <CardDescription className="text-xs">{t("dailyLogbookStatus")}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-3xl font-semibold text-slate-900 dark:text-slate-50">{stats.logbook_stats.progress}%</div>
                  <div className="text-xs text-slate-500 font-medium">{t("ofEntries", { total: stats.logbook_stats.total })}</div>
                </div>
                <Progress value={stats.logbook_stats.progress} className="h-2 mb-4 bg-slate-100 dark:bg-slate-800" />
                
                {stats.logbook_distribution && stats.logbook_stats.total > 0 && (
                  <div className="h-[140px] mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.logbook_distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {stats.logbook_distribution.map((entry: { fill?: string }, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="clean-card">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="flex items-center justify-between text-base font-semibold">
                  {t("assessmentApproval")}
                  {stats.pending_assessments > 0 && (
                    <span className="bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                      {t("pendingCount", { count: stats.pending_assessments })}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {stats.pending_assessments > 0 ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <p className="text-sm text-slate-700 dark:text-slate-300">{t("pendingAssessmentMsg", { count: stats.pending_assessments })}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">{t("noPendingAssessment")}</p>
                )}
              </CardContent>
            </Card>
            
            <Card className="clean-card">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <CardTitle className="text-base font-semibold">{t("latestGrades")}</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {stats.recent_grades?.length === 0 ? (
                  <p className="text-sm text-slate-500">{t("noPublishedGrades")}</p>
                ) : (
                  <div className="space-y-3">
                    {stats.recent_grades?.map((grade: StaseGrade) => (
                      <div key={grade.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
                        <div>
                          <p className="font-medium text-sm text-slate-900 dark:text-slate-50">{grade.rotation_assignment?.stase?.name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{t("score", { score: grade.final_score ?? "" })}</p>
                        </div>
                        <div className="text-xl font-bold text-slate-900 dark:text-slate-50">{grade.letter_grade}</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
