# Chess Coach - Deployment Checklist

Complete this checklist to deploy Chess Coach to Vercel.

## Pre-Deployment Requirements

### Local Verification
- [ ] Clone repository: `git clone <repo-url> && cd chess-coach`
- [ ] Install dependencies: `npm install`
- [ ] Copy environment template: `cp .env.example .env.local`
- [ ] Add API key to `.env.local`: `ANTHROPIC_API_KEY=your_key_here`
- [ ] Run full CI pipeline: `npm run ci`
- [ ] All checks pass (lint, type-check, test, build)
- [ ] No TypeScript errors
- [ ] Coverage >= 80%
- [ ] All tests green

### Code Quality Checks
- [ ] No `console.log` statements in source code
- [ ] No hardcoded secrets (API keys, passwords)
- [ ] No unused variables or imports
- [ ] Code follows style guidelines
- [ ] Meaningful commit messages

### Documentation Review
- [ ] README.md complete and accurate
- [ ] ARCHITECTURE.md describes current system
- [ ] DEVELOPMENT.md has setup instructions
- [ ] API.md documents public interfaces
- [ ] CONTRIBUTING.md guides contributors
- [ ] .env.example documents all env vars
- [ ] No documentation contains secrets

## Vercel Setup

### Create Vercel Account
- [ ] Create account at https://vercel.com
- [ ] Verify email address
- [ ] Connect GitHub account

### Create Vercel Project

#### Option 1: GitHub Integration (Recommended)
1. [ ] Go to Vercel Dashboard
2. [ ] Click "Add New" → "Project"
3. [ ] Select your GitHub account
4. [ ] Select chess-coach repository
5. [ ] Click "Import"

#### Option 2: Using Vercel CLI
```bash
npm install -g vercel
vercel login
vercel link
```
- [ ] CLI installed globally
- [ ] Logged in to Vercel
- [ ] Project linked

### Configure Environment Variables

In Vercel Dashboard or CLI:

```bash
vercel env add ANTHROPIC_API_KEY
# Paste your API key when prompted

# Verify
vercel env list
```

- [ ] ANTHROPIC_API_KEY set in Vercel
- [ ] Value is valid (starts with `sk-ant-`)
- [ ] No typos in variable name

### Verify Vercel Settings

In Vercel Dashboard → Project Settings:

#### Build & Output Settings
- [ ] Framework: Next.js (auto-detected)
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `.next`
- [ ] Install Command: `npm install`

#### Environment Variables
- [ ] ANTHROPIC_API_KEY visible in list
- [ ] Preview Environment has the key
- [ ] Production Environment has the key

#### Domains
- [ ] Custom domain configured (optional)
- [ ] SSL/TLS certificate auto-renewed

#### Automatic Deployments
- [ ] Git integration connected
- [ ] Auto-deploy on push to main: ON
- [ ] Preview deployments for PRs: ON

## Deployment

### Deploy to Production

#### Option 1: Git Push (Recommended)
```bash
git push origin main
```
- [ ] Push code to main branch
- [ ] GitHub Actions CI runs automatically
- [ ] All checks pass in GitHub Actions
- [ ] Vercel automatically deploys on main push

#### Option 2: Using Vercel CLI
```bash
vercel --prod
```
- [ ] Deploy command runs successfully
- [ ] No build errors
- [ ] Deployment completes

### Monitor Deployment

In Vercel Dashboard:
- [ ] Deployment shows "Ready"
- [ ] Build time reasonable (<2 min)
- [ ] No build errors or warnings
- [ ] Preview URL works
- [ ] Custom domain working (if configured)

## Post-Deployment Testing

### Functionality Tests

#### Game Loading
- [ ] Can load game from Lichess URL
- [ ] Can paste PGN notation
- [ ] Game loads and displays
- [ ] Move navigation works
- [ ] Moves are correct

#### Analysis
- [ ] Stockfish engine analyzes positions
- [ ] Evaluations appear in Analysis Panel
- [ ] Evaluation changes when navigating
- [ ] No engine errors in console

#### Coaching
- [ ] Coaching moments detected
- [ ] Moment highlight appears (red outline)
- [ ] Can click "Explain" button
- [ ] Claude response streams correctly
- [ ] Explanation appears in modal
- [ ] Explanation adapts to skill level

#### Settings
- [ ] Settings modal opens
- [ ] Can change skill level
- [ ] Can paste API key in settings
- [ ] Settings save to localStorage
- [ ] Settings persist on reload

#### Error Handling
- [ ] Invalid PGN shows error
- [ ] Invalid API key shows error
- [ ] Network error shows message
- [ ] Errors are user-friendly

### Performance Tests

- [ ] Page loads in <3 seconds
- [ ] Game loading <5 seconds (typical)
- [ ] Engine analysis <2 seconds per position
- [ ] UI responsive while analyzing
- [ ] No lag on move navigation
- [ ] Explanations stream smoothly

### Browser Compatibility

Test in multiple browsers:
- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile browser (iOS Safari, Chrome Mobile)

### Console Check

In browser DevTools Console:
- [ ] No error messages
- [ ] No warnings (except Next.js dev warnings)
- [ ] No 404s for resources
- [ ] No API key exposed

## Monitoring & Maintenance

### Vercel Analytics

In Vercel Dashboard → Analytics:
- [ ] Web Vitals monitored
- [ ] Core Web Vitals acceptable
- [ ] Performance trending

### Error Tracking (Optional)

Consider integrating:
- [ ] Sentry for error tracking
- [ ] LogRocket for session replay
- [ ] Google Analytics for usage

### Regular Checks

Weekly:
- [ ] Check Vercel dashboard for errors
- [ ] Review error logs if available
- [ ] Test critical features work

Monthly:
- [ ] Update dependencies: `npm update`
- [ ] Run security audit: `npm audit`
- [ ] Review performance metrics
- [ ] Check for broken links in docs

## Rollback Plan

If deployment has issues:

### Quick Rollback
```bash
# Via Vercel CLI
vercel rollback

# Or in dashboard: Deployments → Select previous → Promote to Production
```

### Git Rollback
```bash
git revert <commit-hash>
git push origin main
```

- [ ] Know how to rollback if needed
- [ ] Have previous deployment link handy
- [ ] Communicate status to users if needed

## Success Criteria

✅ All Pre-Deployment checks pass
✅ Vercel account created and project set up
✅ Environment variables configured
✅ Code deployed to production
✅ All functionality tests pass
✅ Performance acceptable
✅ No console errors
✅ Documentation updated with live URL
✅ Monitoring in place (optional but recommended)

## Post-Launch

### Announce Deployment
- [ ] Update README with live URL
- [ ] Share deployment link with team/users
- [ ] Update any relevant documentation

### Monitor for Issues
- [ ] Check Vercel analytics daily for first week
- [ ] Monitor error rates
- [ ] Respond to user feedback
- [ ] Fix critical issues immediately

### Future Updates
- [ ] Set up deployment notifications
- [ ] Document deployment process
- [ ] Create runbooks for common issues
- [ ] Plan upgrade schedule

## Support Links

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Anthropic API**: https://docs.anthropic.com
- **GitHub Actions**: https://github.com/features/actions
- **Chess Coach DEVELOPMENT.md**: See ./DEVELOPMENT.md#deployment

## Notes

```
Add deployment-specific notes here:
- Live URL: 
- Vercel Project ID: 
- Vercel Team: 
- Custom Domain: 
- Last Deployment: 
- Known Issues: 
```

---

**Last Updated**: June 2024
**Status**: Ready for deployment
