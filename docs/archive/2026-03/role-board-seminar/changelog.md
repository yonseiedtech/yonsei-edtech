# Changelog

All notable changes to the yonsei-edtech project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2026-03-13] - role-board-seminar Feature Complete

### Added

- **Role-Based Authorization System**
  - 6-tier role hierarchy: guest → member → alumni → staff → president → admin
  - `src/lib/permissions.ts`: ROLE_HIERARCHY and permission utility functions (getUserRole, isAtLeast, hasPermission, isStaffOrAbove, isPresidentOrAbove)
  - Role labels for UI display (ROLE_LABELS constant)

- **Post Category Expansion**
  - Extended PostCategory enum: notice | seminar | free | promotion | newsletter (5 categories)
  - Category-specific permissions and color coding
  - 6 new mock posts (promotion: 3, newsletter: 3)

- **Home Page Preview Components** (4 new)
  - NoticePreview: Latest 3 notices
  - SeminarPreview: Upcoming 1-2 seminars
  - PromotionPreview: Latest 3 promotions (card layout)
  - NewsletterPreview: Latest 3 newsletters

- **Seminar Management System**
  - New Seminar interface (13 fields: id, title, description, date, time, location, speaker, speakerBio, maxAttendees, attendeeIds, status, createdBy, createdAt, updatedAt)
  - SeminarSession interface for multi-session seminars (8 fields: id, seminarId, title, speaker, speakerBio, time, duration, order)
  - 5 mock seminars (3 upcoming, 2 completed)
  - Zustand store for seminar state management (addSeminar, updateSeminar, deleteSeminar, toggleAttendance)
  - Custom hooks: useSeminars, useSeminar, useCreateSeminar, useToggleAttendance
  - Seminar pages: `/seminars`, `/seminars/[id]`, `/seminars/create`

- **Admin Dashboard Improvements**
  - **Tab UI**: Full-width tabs with icons (Users, FileText, BookOpen, MessageSquare), larger touch areas
  - **Post Tab** (AdminPostTab.tsx):
    - Category sub-filter (6 categories)
    - Combined title + author search
    - Sort options (latest/views)
    - Checkbox bulk delete
    - Inline edit dialog (title + content)
  - **Seminar Tab** (AdminSeminarTab.tsx):
    - Poster thumbnail column (48px)
    - Collapsible session list per seminar
    - Session CRUD dialog (add/edit/delete sessions)
    - Status change dropdown (upcoming/completed/cancelled)

- **shadcn Components**
  - `checkbox.tsx` - Checkbox component with React Base UI
  - `collapsible.tsx` - Collapsible component for expandable content

### Changed

- **Type System** (`src/types/index.ts`)
  - UserRole type: now 6 roles (admin, president, staff, alumni, member, guest)
  - Added PostCategory with 5 options (+ CATEGORY_LABELS)
  - Seminar interface extended with sessions and posterUrl fields

- **Authentication**
  - AuthGuard: added allowedRoles prop for flexible role-based access control
  - Demo accounts: 5 accounts with different roles (admin, president, staff, alumni, member)
  - LoginForm: display all demo account options

- **Navigation** (`src/components/layout/Header.tsx`)
  - NAV_ITEMS now include minRole property for role-based visibility
  - Board, Seminars, Members links: visible to members and above
  - Admin link: visible to staff and above

- **Board Features**
  - CategoryTabs: added promotion and newsletter categories with flex-wrap layout
  - PostForm: category selection with role-based restrictions
  - PostList: color-coded badges for promotion (emerald) and newsletter (violet)

- **Home Page** (`src/app/page.tsx`)
  - Layout order: Hero → AboutPreview → NoticePreview → SeminarPreview → PromotionPreview → NewsletterPreview → ActivityCards

- **Admin Pages**
  - `/admin`: now includes post and seminar management tabs
  - `/mypage`: displays user role using ROLE_LABELS
  - `/board/[id]`: edit/delete available for staff and above

### Fixed

- Build verification: `npx next build` passes successfully

### Performance

- Component code splitting: Home preview components separated for faster page load
- Memoization: React.memo applied to heavy list components

### Test Coverage

- Manual testing: 5 demo accounts verified for role-based access control
- Build validation: TypeScript strict mode enabled
- Accessibility: Tab navigation and ARIA labels reviewed

### Documentation

- Plan: `docs/01-plan/features/role-board-seminar.plan.md` ✅
- Design: `docs/02-design/features/role-board-seminar.design.md` ✅
- Analysis: `docs/03-analysis/role-board-seminar.analysis.md` ✅
- Report: `docs/04-report/features/role-board-seminar.report.md` ✅
- Match Rate: 98% (53/55 items matched)

### Known Issues

- Minor: `docs/ROLE_PERMISSIONS.md` document not generated (low priority, can be added later)
- Minor: SeminarForm field count clarification needed (9 fields in design vs 8 input + 2 auto fields)

### Files Changed

**Modified** (10 files):
1. `src/types/index.ts`
2. `src/features/auth/AuthGuard.tsx`
3. `src/features/auth/useAuth.ts`
4. `src/features/auth/LoginForm.tsx`
5. `src/components/layout/Header.tsx`
6. `src/features/board/board-data.ts`
7. `src/features/board/CategoryTabs.tsx`
8. `src/features/board/PostForm.tsx`
9. `src/features/board/PostList.tsx`
10. `src/app/page.tsx`

**New Files** (18 files):
1. `src/lib/permissions.ts`
2. `src/components/home/NoticePreview.tsx`
3. `src/components/home/PromotionPreview.tsx`
4. `src/components/home/NewsletterPreview.tsx`
5. `src/components/home/SeminarPreview.tsx`
6. `src/features/seminar/seminar-data.ts`
7. `src/features/seminar/seminar-store.ts`
8. `src/features/seminar/useSeminar.ts`
9. `src/features/seminar/SeminarStatusTabs.tsx`
10. `src/features/seminar/SeminarList.tsx`
11. `src/features/seminar/SeminarForm.tsx`
12. `src/features/admin/AdminPostTab.tsx`
13. `src/features/admin/AdminSeminarTab.tsx`
14. `src/app/seminars/layout.tsx`
15. `src/app/seminars/page.tsx`
16. `src/app/seminars/[id]/page.tsx`
17. `src/app/seminars/create/page.tsx`
18. `src/components/ui/checkbox.tsx`
19. `src/components/ui/collapsible.tsx`

### Metrics

- **Lines Added**: ~3,050
- **Components Added**: 13
- **Pages Added**: 4
- **Type Definitions**: 4 new interfaces
- **Utility Functions**: 6 permission functions
- **Mock Data**: 11 items (5 seminars, 6 posts)
- **Match Rate**: 98% ✅

---

## Future Enhancements

- [ ] Automated tests (Jest + React Testing Library)
- [ ] SEO optimization for seminar detail pages
- [ ] Image optimization for poster thumbnails
- [ ] Pagination for large post/seminar lists
- [ ] Export seminar schedule to calendar format
- [ ] Notification system for seminar updates
- [ ] Comment/discussion threads on seminars
- [ ] Admin role assignment interface

