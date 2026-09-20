import React from 'react';
import { STAGE_COLORS, STAGE_BG } from '../data/mock';
import type { Stage } from '../types';

// ─── Avatar ────────────────────────────────────────────────────────────────
interface AvatarProps {
  name: string;
  initials: string;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}
const SIZES = { xs: 'w-6 h-6 text-[10px]', sm: 'w-7 h-7 text-xs', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm', xl: 'w-12 h-12 text-base' };
export function Avatar({ name, initials, color = '#6B7280', size = 'md' }: AvatarProps) {
  return (
    <div
      className={`${SIZES[size]} rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials}
    </div>
  );
}

// ─── Stage Badge ────────────────────────────────────────────────────────────
export function StageBadge({ stage }: { stage: Stage | string }) {
  const color = STAGE_COLORS[stage] ?? '#9CA3AF';
  const bg = STAGE_BG[stage] ?? '#F9FAFB';
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium" style={{ color, backgroundColor: bg }}>
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      {stage}
    </span>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────
type StatusVariant = 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'needs-info' | 'draft' | 'open' | 'closed' | 'archived' | 'high' | 'medium' | 'low';
const STATUS_STYLES: Record<StatusVariant, string> = {
  active: 'bg-green-50 text-green-700',
  inactive: 'bg-gray-100 text-gray-500',
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
  'needs-info': 'bg-blue-50 text-blue-700',
  draft: 'bg-gray-100 text-gray-500',
  open: 'bg-green-50 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
  archived: 'bg-gray-100 text-gray-400',
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-gray-100 text-gray-500',
};
const STATUS_DOTS: Record<StatusVariant, string> = {
  active: 'bg-green-500', inactive: 'bg-gray-400', pending: 'bg-amber-500',
  approved: 'bg-green-500', rejected: 'bg-red-500', 'needs-info': 'bg-blue-500',
  draft: 'bg-gray-400', open: 'bg-green-500', closed: 'bg-gray-400',
  archived: 'bg-gray-300', high: 'bg-red-500', medium: 'bg-amber-500', low: 'bg-gray-400',
};
export function StatusBadge({ variant, label }: { variant: StatusVariant; label?: string }) {
  const styles = STATUS_STYLES[variant];
  const dot = STATUS_DOTS[variant];
  const text = label ?? variant.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      {text}
    </span>
  );
}

// ─── Button ────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}
const BTN_VARIANTS = {
  primary: 'bg-lime text-[#0D0F14] font-semibold hover:bg-lime-hover active:scale-[0.98]',
  secondary: 'bg-white border border-border text-gray-700 font-medium hover:bg-gray-50 active:scale-[0.98]',
  ghost: 'text-gray-600 hover:bg-gray-100 font-medium',
  danger: 'bg-red-50 border border-red-200 text-red-600 font-medium hover:bg-red-100',
};
const BTN_SIZES = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
export function Button({ variant = 'secondary', size = 'md', icon, children, className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${BTN_VARIANTS[variant]} ${BTN_SIZES[size]} ${className}`}
      {...rest}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

// ─── Input ─────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
}
export function Input({ icon, label, className = '', id, ...rest }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-xs font-medium text-gray-600">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">{icon}</span>}
        <input
          id={id}
          className={`w-full h-9 rounded-lg border border-border bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime transition-all ${icon ? 'pl-8 pr-3' : 'px-3'} ${className}`}
          {...rest}
        />
      </div>
    </div>
  );
}

// ─── Select ────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}
export function Select({ label, options, className = '', id, ...rest }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-xs font-medium text-gray-600">{label}</label>}
      <select
        id={id}
        className={`h-9 rounded-lg border border-border bg-white text-sm text-gray-900 px-3 focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime transition-all cursor-pointer ${className}`}
        {...rest}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Textarea ──────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export function Textarea({ label, className = '', id, ...rest }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label htmlFor={id} className="text-xs font-medium text-gray-600">{label}</label>}
      <textarea
        id={id}
        className={`w-full rounded-lg border border-border bg-white text-sm text-gray-900 placeholder:text-gray-400 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime transition-all resize-none ${className}`}
        {...rest}
      />
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-white rounded-xl border border-border ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────
export function SectionHeader({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {count !== undefined && (
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {action}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center animate-fade-in">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">{icon}</div>
      <p className="text-sm font-semibold text-gray-900 mb-1">{title}</p>
      <p className="text-xs text-gray-500 max-w-xs mb-4">{description}</p>
      {action}
    </div>
  );
}

// ─── Tab Bar ───────────────────────────────────────────────────────────────
export function TabBar({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (t: string) => void }) {
  return (
    <div className="flex border-b border-border">
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${active === tab ? 'border-lime text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

// ─── Divider ───────────────────────────────────────────────────────────────
export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-border" />;
  return (
    <div className="flex items-center gap-3">
      <hr className="flex-1 border-border" />
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <hr className="flex-1 border-border" />
    </div>
  );
}

// ─── Metric Tile ───────────────────────────────────────────────────────────
export function MetricTile({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-lime' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </Card>
  );
}

// ─── Icon buttons ──────────────────────────────────────────────────────────
export function IconButton({ icon, onClick, title, className = '' }: { icon: React.ReactNode; onClick?: () => void; title?: string; className?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer ${className}`}
    >
      {icon}
    </button>
  );
}

// ─── Search Input ──────────────────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-8 w-full pl-8 pr-3 rounded-lg border border-border bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lime/40 focus:border-lime transition-all"
      />
    </div>
  );
}

// ─── Page Header ───────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── LinkedIn Icon ─────────────────────────────────────────────────────────
export function LinkedInIcon({ href }: { href?: string }) {
  if (!href) return null;
  return (
    <a href={`https://${href}`} target="_blank" rel="noopener noreferrer" title="LinkedIn profile"
      className="w-5 h-5 rounded flex items-center justify-center bg-blue-600 text-white hover:bg-blue-700 transition-colors shrink-0">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    </a>
  );
}

// ─── CV Badge ──────────────────────────────────────────────────────────────
export function CVBadge({ file }: { file?: string }) {
  if (!file) return <span className="text-xs text-gray-400">No CV</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600 font-medium">
      <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {file}
    </span>
  );
}

// ─── Confirm Dialog ────────────────────────────────────────────────────────
export function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', danger = false }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
  confirmLabel?: string; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-gray-900 mb-1">{title}</h3>
        <p className="text-xs text-gray-500 mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
