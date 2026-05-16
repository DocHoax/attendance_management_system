import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useStudent } from '@/hooks/useAuthHooks';
import { useToast } from '@/hooks/useToast';
import { getStudentCourses, getStudentProgress, upsertStudentProgress, subscribeToStudentProgress } from '@/services/universityService';
import type { Course } from '@/types';
import type { ProgressEntry } from '@/services/universityService';

export function StudentProgressPage() {
  const student = useStudent();
  const { success } = useToast();

  const [courses, setCourses] = useState<Course[]>([]);
  const [entries, setEntries] = useState<ProgressEntry[]>([]);

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [keyText, setKeyText] = useState('module-1');
  const [progressValue, setProgressValue] = useState<number>(0);

  useEffect(() => {
    if (!student) return;

    void getStudentCourses(student.id).then((c) => setCourses(c));
    void getStudentProgress(student.id).then((p) => setEntries(p || []));

    const cleanup = subscribeToStudentProgress(student.id, (entry) => {
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== entry.id && !(e.userId === entry.userId && e.courseId === entry.courseId && e.key === entry.key));
        next.unshift(entry);
        return next;
      });

      success(`Progress updated: ${entry.key} — ${Math.round(entry.progressValue)}%`);
    });

    return () => {
      cleanup?.();
    };
  }, [student]);

  if (!student) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const payload = [{ courseId: selectedCourseId ?? null, key: keyText.trim() || 'module-1', progressValue: Math.max(0, Math.min(100, Math.round(progressValue))), meta: null }];

    const updated = await upsertStudentProgress(student.id, payload);

    if (updated && updated.length > 0) {
      setEntries((prev) => [updated[0], ...prev.filter((p) => p.id !== updated[0].id)]);
      success('Progress saved');
      setKeyText('');
      setProgressValue(0);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/dashboard" className="text-muted-foreground hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-white">My Progress</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="glass-card p-6 lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-white">Track Progress</h2>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Course (optional)</label>
            <Select value={selectedCourseId ?? ''} onValueChange={(v) => setSelectedCourseId(v || null)}>
              <SelectTrigger className="w-full">
                <SelectValue>{selectedCourseId ? (courses.find((c) => c.id === selectedCourseId)?.title ?? 'Selected') : 'All / General'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All / General</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>{`${course.code} • ${course.title}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Key / Module</label>
            <Input value={keyText} onChange={(e) => setKeyText(e.target.value)} placeholder="e.g. module-1" />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-2">Progress (%)</label>
            <Input type="number" value={progressValue} onChange={(e) => setProgressValue(Number(e.target.value || 0))} min={0} max={100} />
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit">Save Progress</Button>
            <Button variant="ghost" onClick={() => { setKeyText(''); setProgressValue(0); setSelectedCourseId(null); }}>Reset</Button>
          </div>
        </form>

        <div className="glass-card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Progress</h2>
          <div className="space-y-3">
            {entries.length > 0 ? (
              entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{entry.courseId ? (courses.find((c) => c.id === entry.courseId)?.code ?? 'Course') : entry.key}</p>
                    <p className="text-xs text-muted-foreground">{entry.key} • Updated {new Date(entry.updatedAt).toLocaleString()}</p>
                  </div>
                  <div className="text-sm font-medium text-white">{Math.round(entry.progressValue)}%</div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-slate-800/30 p-6 text-sm text-muted-foreground">No progress tracked yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StudentProgressPage;
