import { Search, ShieldCheck, Lightbulb, History, Settings, CircleHelp, LogOut,
  FileText, Link, ScanLine, CreditCard, Eraser, Sparkles, Info, ThumbsUp,
  ThumbsDown, Copy, Plus, Hourglass, CircleCheck, TriangleAlert, ShieldAlert,
  Eye, EyeOff, LockKeyhole, FolderClock } from 'lucide-react';
const icons = { Search, ShieldCheck, Lightbulb, History, Settings, CircleHelp, LogOut,
  FileText, Link, ScanLine, CreditCard, Eraser, Sparkles, Info, ThumbsUp,
  ThumbsDown, Copy, Plus, Hourglass, CircleCheck, TriangleAlert, ShieldAlert,
  Eye, EyeOff, LockKeyhole, FolderClock };
export function Icon({ name, size = 18 }: { name: keyof typeof icons; size?: number }) {
  const Component = icons[name];
  return <Component size={size} aria-hidden="true" />;
}
