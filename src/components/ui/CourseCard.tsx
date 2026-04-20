import { motion } from 'framer-motion';
import { Clock, MapPin, Users, ChevronRight } from 'lucide-react';
import type { Course } from '@/types';

interface CourseCardProps {
  course: Course;
  onClick?: () => void;
  showLecturer?: boolean;
  actionLabel?: string;
  delay?: number;
}

export function CourseCard({ 
  course, 
  onClick, 
  showLecturer = true,
  actionLabel = 'View Details',
  delay = 0 
}: CourseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="glass-card-hover p-5 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: course.color }}
        >
          {course.code.split(' ')[0]}
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <span className="text-sm">{actionLabel}</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-primary transition-colors">
        {course.code}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
        {course.title}
      </p>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{course.schedule.day}, {course.schedule.startTime} - {course.schedule.endTime}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{course.schedule.room}</span>
        </div>
        
        {showLecturer && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>{course.lecturerName}</span>
          </div>
        )}
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground">Active</span>
        </div>
        <span className="text-xs text-muted-foreground">{course.totalStudents} students</span>
      </div>
    </motion.div>
  );
}
