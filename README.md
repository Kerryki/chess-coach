# Chess Coach

> AI-powered chess analysis and personalized coaching using Claude AI and Stockfish

**Chess Coach** is an intelligent chess learning application that combines real-time position analysis with personalized AI coaching. Load a chess game (PGN), analyze critical moments, and get adaptive explanations tailored to your skill level.

## Features

### ♟️ Core Analysis
- **PGN Game Support** - Load games from Lichess.org or paste PGN notation directly
- **Real-time Board** - Interactive chessboard with full move navigation
- **Stockfish Engine** - Browser-based chess engine for position evaluation (<2s per move)
- **Move Evaluation** - Identify blunders, mistakes, and missed opportunities

### 🎯 AI Coaching
- **Smart Moment Detection** - Automatically identify critical positions (blunders, tactics)
- **Adaptive Explanations** - Claude AI coaching tailored to beginner/intermediate/advanced levels
- **Deep Dive Analysis** - Stream extended explanations for any position
- **Error Context** - Understand why moves were problematic

### ⚙️ Customization
- **Skill Level Selection** - Set your level to receive appropriate guidance
- **Persistent Settings** - API key and preferences saved locally
- **Theme Support** - Light/dark mode interface

### 🚀 Performance
- **Client-Side Processing** - No server overhead for chess analysis
- **Optimized Engine** - Stockfish.js for browser compatibility
- **Streaming Responses** - Real-time Claude AI explanations

## Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Anthropic API Key** (free tier available at [console.anthropic.com](https://console.anthropic.com/account/keys))

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/chess-coach.git
cd chess-coach

# Install dependencies
npm install

# Create environment configuration
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
```

### Running Locally

```bash
# Development server (port 3000)
npm run dev

# Production build
npm run build
npm start

# Type checking
npm run type-check

# Linting
npm run lint
```

### Running Tests

```bash
# Unit and integration tests
npm test

# Watch mode for TDD
npm test -- --watch

# Test coverage report
npm run coverage

# E2E tests (requires running dev server)
npm run test:e2e

# CI pipeline (lint, type-check, test, build)
npm run ci
```

## Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Required: Anthropic Claude API key
ANTHROPIC_API_KEY=your_api_key_here
```

See `.env.example` for all available options.

**Getting an API Key:**
1. Visit [console.anthropic.com](https://console.anthropic.com/account/keys)
2. Sign up or log in
3. Create a new API key
4. Add to `.env.local` (never commit to version control)

### Skill Levels

Select your chess level for appropriate coaching:

- **Beginner** - Explains fundamental concepts and basic tactics
- **Intermediate** - Covers positional understanding and intermediate tactics
- **Advanced** - Discusses opening principles, endgame techniques, and complex strategy

## Usage Guide

### Loading a Game

1. **From Lichess.org**
   - Enter a game URL (e.g., `https://lichess.org/abc12def`)
   - Click "Fetch & Analyze"

2. **From PGN Text**
   - Paste standard PGN notation
   - Click "Parse & Analyze"

3. **Supported Formats**
   - Standard algebraic notation (e.g., `1. e4 c5 2. Nf3 d6`)
   - Full PGN with metadata (tags, comments)

### Analyzing a Game

1. **Navigation**
   - Use move list or arrow controls to navigate moves
   - Blue highlight shows current position
   - Click any move to jump to that point

2. **Position Analysis**
   - Stockfish evaluation appears in the Analysis Panel
   - Cp (centipawns) = 100 cp ≈ 1 pawn advantage
   - Mate# indicates forced checkmate in N moves

3. **Coaching Moments**
   - Red-outlined moments are automatically highlighted
   - Contains blunders, mistakes, or missed opportunities
   - Click "Explain" for AI coaching

4. **Deep Dive**
   - Click "Deep Dive" on any position
   - Claude streams detailed explanation
   - Stream continues until explanation is complete

## Deployment

### Vercel (Recommended)

```bash
# Deploy automatically on push
git push origin main

# Or deploy manually
npm install -g vercel
vercel --prod
```

**Environment Setup:**
1. Create Vercel project: `vercel`
2. Set environment variable: `ANTHROPIC_API_KEY`
3. Deploy: `vercel --prod`

See [DEVELOPMENT.md](./DEVELOPMENT.md#deployment) for detailed instructions.

### Other Platforms

Chess Coach is a Next.js application and can be deployed to:
- **Netlify** - See [Next.js on Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)
- **Railway** - See [Railway Docs](https://railway.app/docs)
- **Docker** - See [Dockerfile](./Dockerfile) (if provided)

## Technology Stack

### Frontend
- **React 18** - UI component framework
- **Next.js 15** - React framework with routing and SSR
- **TypeScript** - Type-safe JavaScript

### Chess
- **chess.js** - PGN parsing and move validation
- **Stockfish.js** - Browser-based chess engine
- **Board.js** - Interactive chessboard visualization

### AI & Analysis
- **@anthropic-ai/sdk** - Claude AI integration for coaching
- **Zod** - Runtime type validation

### Testing
- **Jest** - Unit and integration tests
- **Playwright** - E2E testing
- **React Testing Library** - Component testing

### Development
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Architecture

Chess Coach follows a modular architecture with clear separation of concerns:

```
app/                          # React components
├── components/               # Reusable UI components
│   ├── Chessboard.tsx       # Interactive board display
│   ├── GameInput.tsx        # PGN input form
│   ├── AnalysisPanel.tsx    # Stockfish evaluation display
│   ├── CoachingPanel.tsx    # AI coaching display
│   └── ...
├── layout.tsx               # Root layout with styling
└── page.tsx                 # Home page entry point

lib/                          # Business logic and utilities
├── chess/                   # Chess-specific modules
│   ├── pgn/                 # PGN parsing and fetching
│   ├── board/               # Move validation and board state
│   └── engine/              # Stockfish analysis
├── coaching/                # AI coaching logic
│   └── analyzer.ts          # Moment detection and analysis
├── hooks/                   # React custom hooks
├── storage/                 # Browser storage utilities
├── types/                   # TypeScript type definitions
├── utils/                   # Utility functions
└── constants/               # Configuration constants
```

For detailed architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Limitations

### Current Limitations
- **Skill-Based Explanations** - Beginner explanations may not cover advanced concepts
- **Engine Strength** - Stockfish in browser is less powerful than desktop versions
- **Analysis Depth** - Positions analyzed up to ~20 plies for performance
- **PGN Format** - Comments and complex variants may not parse correctly
- **Mobile Performance** - Best experience on desktop; mobile UI is responsive but may be slower

### Known Issues
- Endgame tablebases not available (no perfect endgame evaluation)
- Very complex positions may take >2 seconds to analyze
- Some PGN variants with nested comments not fully supported

### Planned Features (Roadmap)
- [ ] Opening library and recommendations
- [ ] Endgame technique tutorials
- [ ] Game statistics and improvement tracking
- [ ] Multi-variant analysis (what if analysis)
- [ ] Opening repertoire builder
- [ ] Offline mode with pre-built databases
- [ ] Mobile app (React Native)

## Error Handling

Chess Coach includes comprehensive error handling:

- **API Errors** - Clear messages for network and API issues
- **Validation Errors** - Invalid PGN notation detected with helpful messages
- **Engine Errors** - Graceful fallback if Stockfish fails
- **Missing API Key** - User-friendly prompt to configure credentials

See [DEVELOPMENT.md](./DEVELOPMENT.md#error-handling) for debugging.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./.github/CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Follow the coding standards in [DEVELOPMENT.md](./DEVELOPMENT.md)
4. Write tests (80%+ coverage required)
5. Submit a pull request

## License

MIT License - See [LICENSE](./LICENSE) (if available)

## Support

- **Questions?** Check [DEVELOPMENT.md](./DEVELOPMENT.md) for FAQs
- **Found a bug?** [Open an issue](https://github.com/yourusername/chess-coach/issues)
- **Want to contribute?** See [CONTRIBUTING.md](./.github/CONTRIBUTING.md)

## Acknowledgments

- [Lichess.org](https://lichess.org) for game database and API
- [Stockfish](https://stockfishchess.org/) for the chess engine
- [Anthropic](https://anthropic.com) for Claude AI
- Chess community for feedback and suggestions
