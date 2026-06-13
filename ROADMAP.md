# Development Roadmap

This roadmap outlines the milestones for building the Ton-GPT application.

## Phase 1: Foundation (Current)
- [x] Initial Next.js 15 App Router setup
- [x] Tailwind CSS and TypeScript configuration
- [x] PWA support integration (`@serwist/next`)
- [x] Core directory structure (student, teacher, auth)
- [x] Reusable UI components scaffolded

## Phase 2: Local Database & UI
- [x] Implement `idb` wrapper for IndexedDB operations
- [x] Create UI for adding and listing vocabulary
- [x] Implement offline-first learning calendar UI
- [x] Implement audio recording & playback components

## Phase 3: Supabase Integration & Auth
- [x] Set up Supabase project and database schema
- [x] Implement Authentication (Login/Register)
- [x] Implement database operations for requests and feedback comments

## Phase 4: Audio Exchange & Teacher Mode
- [x] Implement pronunciation request system (student → teacher)
- [x] Teacher dashboard to view and respond to requests
- [x] Implement audio upload using Supabase Storage
- [x] Add comment functionality on requests
- [x] Implement audio download / teacher reference playback (student side)

## Phase 5: Pronunciation Analysis
- [x] Research and implement tone comparison algorithms
- [x] Implement canvas pitch comparison curves for visual analysis
- [x] Provide automated feedback on tone and rhythm accuracy

## Phase 6: Polish and Deployment (Current)
- [ ] Comprehensive PWA testing on iOS and Android devices
- [ ] UI/UX refinements for mobile interactions
- [ ] Production deployment to Vercel
- [ ] Teacher and Student onboarding flow
