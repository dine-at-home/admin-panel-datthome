# admin-panel-datthome — Next.js 15 admin

## Stack
- Next.js 15.5 App Router, React 18.3, TypeScript
- TailwindCSS, shadcn/ui, React Hook Form
- Admin-only JWT auth, port 3002

## Layout
```
app/
├── login/page.tsx
└── dashboard/
    ├── layout.tsx          auth-protected
    ├── page.tsx            overview
    ├── users/              list + [id] detail (block/delete)
    ├── dinners/            list + [id] detail (remove with reason)
    ├── bookings/           list + filter by status
    ├── payouts/            host payout tracking
    └── ads/                primary/secondary ad slots
lib/
├── auth.ts
├── api-config.ts           NEXT_PUBLIC_API_URL
└── utils.ts
```

## Rules
- Don't mutate payment/payout records directly — always call backend endpoints
- Admin role assigned manually in DB

## Commands
```
npm run dev      # port 3002
npm run build
npm run lint
```
