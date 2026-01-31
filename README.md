# Vibestar

A real-time multiplayer music timeline game where players test their knowledge of songs and their release years.

## What is Vibestar?

Players import YouTube Music playlists, listen to song clips, guess song names, and place them on a chronological timeline. The first player to correctly place 10 songs on their timeline wins.

## Features

- **Real-time Multiplayer** - 1-10 players per room with instant synchronization
- **YouTube Playlist Integration** - Import any YouTube Music playlist
- **Song Guessing** - Listen to randomized clips and guess the song name
- **Timeline Placement** - Place songs chronologically based on release year
- **Contest System** - Spend tokens to challenge other players' placements
- **Anonymous Play** - No account required (Google OAuth optional)

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | TanStack React Start |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| Database | PostgreSQL + Prisma ORM |
| Auth | Better Auth (Anonymous + Google OAuth) |
| Real-time | Pusher WebSockets |
| External APIs | YouTube Data API v3 |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- [Pusher account](https://pusher.com/)
- [YouTube Data API key](https://console.cloud.google.com/)
- (Optional) Google OAuth credentials

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@host/dbname"

# Better Auth
BETTER_AUTH_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-secret-here"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Pusher
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
PUSHER_CLUSTER="eu"
VITE_PUSHER_KEY="your-key"
VITE_PUSHER_CLUSTER="eu"

# YouTube
YOUTUBE_API_KEY="your-api-key"
```

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

## How to Play

1. **Create a Room** - Set your display name and create a new game room
2. **Share the Code** - Give the 6-character room code to friends
3. **Import a Playlist** - Host imports a YouTube Music playlist
4. **Start the Game** - Host clicks "Start Game" when everyone is ready

### Each Round

1. **Listen** - A random clip from the playlist plays (10-30 seconds)
2. **Guess** - Type the song name (fuzzy matching is forgiving)
3. **Place** - Put the song on your timeline where you think it belongs chronologically
4. **Contest** - Other players can spend tokens to bet on a different position
5. **Reveal** - See who got it right and earn points/tokens

### Scoring

- **Correct song name** → +1 token (use to contest)
- **Correct timeline placement** → +1 point (song added to timeline)
- **Win condition** → First to 10 songs on timeline

## Project Structure

```
src/
├── routes/              # File-based routing
│   ├── index.tsx        # Landing page
│   ├── create.tsx       # Create room
│   ├── join.tsx         # Join room
│   ├── room.$code.tsx   # Room lobby
│   └── play.$gameId.tsx # Game play
├── components/
│   └── game/            # Game components
│       ├── Timeline.tsx
│       ├── YouTubePlayer.tsx
│       ├── SongGuesser.tsx
│       ├── RoundResult.tsx
│       └── Scoreboard.tsx
├── server/functions/    # Server functions
│   ├── game.ts          # Game logic
│   ├── room.ts          # Room management
│   └── playlist.ts      # Playlist import
├── lib/
│   ├── game/            # Game utilities
│   ├── youtube/         # YouTube API
│   ├── pusher/          # Real-time events
│   └── auth.ts          # Authentication
└── hooks/
    └── usePusher.ts     # Pusher React hooks
```

## Database Schema

### Core Models

- **Playlist** - Imported YouTube playlists
- **Song** - Individual tracks with metadata (name, artist, year)
- **GameRoom** - Multiplayer lobby with room code
- **Game** - Active game session
- **Player** - Player in a room with score and tokens
- **GameRound** - Individual round with clip timing
- **TimelineEntry** - Songs placed on a player's timeline
- **RoundGuess** - Player's guess and placement for a round

## Real-time Events

Events are broadcast via Pusher channels:

- `room:player-joined` / `room:player-left` - Player presence
- `room:game-started` - Game begins
- `game:round-start` - Clip starts playing
- `game:contest-window` - Contest period opens
- `game:contest-submitted` - Another player contested
- `game:round-result` - Results revealed
- `game:turn-change` - Next player's turn
- `game:ended` - Game over

## Scripts

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Check linting
npm run format     # Check formatting
npm run check      # Fix lint & format issues
npm run test       # Run tests

# Database
npm run db:generate  # Generate Prisma types
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

## Game Mechanics

### Timeline Placement

Songs must be placed in chronological order by release year. When placing a song:
- If correct, it's added to your timeline
- If incorrect, it's not added (no penalty)

### Contest System

During the 15-second contest window:
- Players with tokens can bet on a different position
- Costs 1 token (earned from correct song name guesses)
- If your position is correct, you get the song on your timeline too
- Multiple players can win the same song

### Clip Generation

- Clips are 10-30 seconds (host configurable)
- Start time avoids intro (first 30s) and outro (last 10s)
- Randomized within the safe zone

## License

MIT
