# Development Roadmap

This roadmap outlines the milestones for building the Ton-GPT application.

## Phase 1: Foundation (Current)
- [x] Initial Next.js 15 App Router setup
- [x] Tailwind CSS and TypeScript configuration
- [x] PWA support integration (`@serwist/next`)
- [x] Core directory structure (student, teacher, auth)
- [x] Reusable UI components scaffolded

## Phase 2: Local Database & UI
- [ ] Implement `idb` wrapper for IndexedDB operations
- [ ] Create UI for adding and listing vocabulary
- [ ] Implement offline-first learning calendar UI
- [ ] Implement audio recording & playback components

## Phase 3: Supabase Integration & Auth
- [ ] Set up Supabase project and database schema
- [ ] Implement Authentication (Login/Register)
- [ ] Implement data synchronization for specific tables (requests, comments)

## Phase 4: Audio Exchange & Teacher Mode
- [ ] Implement pronunciation request system (student -> teacher)
- [ ] Teacher dashboard to view and respond to requests
- [ ] Implement audio upload and download using Supabase Storage
- [ ] Add comment functionality on requests

## Phase 5: Pronunciation Analysis (Future)
- [ ] Research and implement tone comparison algorithms
- [ ] Implement visual audio wave forms for comparison
- [ ] Provide automated feedback on Tone 0-4 accuracy

## Phase 6: Polish and Deployment
- [ ] Comprehensive PWA testing on iOS and Android devices
- [ ] UI/UX refinements for mobile interactions
- [ ] Production deployment to Vercel
- [ ] Teacher and Student onboarding flow
