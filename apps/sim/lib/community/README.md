# Community User Management System

A comprehensive community user management system for Sim's marketplace platform, featuring reputation tracking, badge systems, social features, and privacy controls.

## Overview

The Community User Management System provides enterprise-grade user profile management with sophisticated reputation tracking, achievement badges, social networking features, and robust privacy controls. Built to integrate seamlessly with Sim's existing template marketplace, it enables community-driven content creation and curation.

## Features

### 🏆 Reputation System
- **Point-based reputation** with multiple contribution types
- **8-level progression system** from Newcomer to Hall of Fame
- **Anti-gaming protection** with fraud detection
- **Quality metrics tracking** (average ratings, consistency, helpfulness)
- **Historical audit trail** for transparency
- **Automated calculations** with manual recalculation support

### 🏅 Badge & Achievement System
- **5-tier badge system** (Bronze, Silver, Gold, Platinum, Special)
- **Multiple badge categories** (Contribution, Quality, Milestone, Community, Special)
- **Automatic badge awards** based on achievements
- **Featured badge showcase** on user profiles
- **Custom badge criteria** with flexible configuration

### 👤 Enhanced User Profiles
- **Extended profile information** (bio, title, company, location)
- **Skills and specializations** tracking
- **Social media links** integration
- **Verification system** with trust scores
- **Privacy controls** (Public, Community, Private visibility)
- **Profile customization** (avatar, banner, theme colors)

### 🤝 Social Features
- **Following system** with mutual relationship detection
- **Activity feeds** with privacy controls
- **Direct messaging** support (when enabled)
- **Community leaderboards** with multiple sorting options
- **User discovery** and search functionality

### 🔒 Privacy & Security
- **GDPR compliant** data handling
- **Granular privacy controls** for profile visibility
- **Anti-gaming detection** for reputation manipulation
- **Rate limiting** on sensitive operations
- **Comprehensive audit logging** for all activities

## Architecture

### Database Schema

The system extends the existing Sim database with the following tables:

```sql
-- Core community profile data
community_user_profiles
user_reputation
user_reputation_history

-- Badge and achievement system
community_badge_definitions
community_user_badges

-- Social features
community_user_follows
community_user_activities
```

### API Endpoints

#### User Management
- `GET /api/community/users` - Search and discover users
- `POST /api/community/users` - Create/update community profile
- `DELETE /api/community/users` - Delete community profile

#### Individual User Operations
- `GET /api/community/users/[userId]` - Get complete user profile
- `PUT /api/community/users/[userId]` - Update user profile (own only)
- `DELETE /api/community/users/[userId]` - Delete user profile (own only)

#### Reputation Management
- `GET /api/community/users/[userId]/reputation` - Get reputation summary
- `POST /api/community/users/[userId]/reputation` - Recalculate reputation
- `GET /api/community/users/[userId]/reputation/history` - Get reputation history

### Components

#### React Components
- `UserProfile` - Complete user profile display with tabs
- `ReputationDisplay` - Reputation level and progress visualization
- `BadgeShowcase` - Badge collection display with tiers
- `SocialStats` - Follower/following counts and actions
- `ActivityFeed` - User activity timeline with filtering

## Usage Examples

### Basic User Profile Display

```tsx
import { UserProfile } from '@/components/community/user-profile'

function ProfilePage({ userId }: { userId: string }) {
  return (
    <UserProfile
      userId={userId}
      onFollow={(userId) => followUser(userId)}
      onUnfollow={(userId) => unfollowUser(userId)}
      onMessage={(userId) => openDirectMessage(userId)}
    />
  )
}
```

### Reputation System Integration

```typescript
import { CommunityReputationSystem } from '@/lib/community/reputation-system'

// Get reputation system instance
const reputationSystem = CommunityReputationSystem.getInstance()

// Calculate user reputation
const calculation = await reputationSystem.calculateUserReputation(userId)

// Get reputation summary
const summary = await reputationSystem.getUserReputationSummary(userId)

// Get leaderboard
const leaderboard = await reputationSystem.getLeaderboard(50, 0)
```

### User Search and Discovery

```typescript
// Search users with filters
const response = await fetch('/api/community/users?' + new URLSearchParams({
  query: 'automation expert',
  specialization: 'CRM',
  minReputation: '1000',
  sortBy: 'reputation',
  limit: '20'
}))

const { users, pagination } = await response.json()
```

## Reputation Point Values

The system awards points for various community contributions:

| Activity | Points | Description |
|----------|--------|-------------|
| Template Created | 50 | Publishing a new template |
| 5-Star Rating Received | 25 | Receiving a perfect rating |
| 4-Star Rating Received | 15 | Receiving a high rating |
| Helpful Review Written | 10 | Writing a helpful review |
| Review Marked Helpful | 5 | Your review marked as helpful |
| Template Favorited | 5 | Someone favorites your template |
| Template Downloaded | 2 | Someone uses your template |
| Rating Given | 1 | Participating in community ratings |

### Penalties
- Violation Penalty: -20 points
- Spam Penalty: -50 points
- Quality Issue Penalty: -10 points

### Bonuses
- Consistency Bonus: +50 points (maintaining 4+ star average across 5+ templates)
- Quality Streak Bonus: +30 points (consecutive high-quality contributions)
- Verified User Bonus: +100 points (one-time verification bonus)

## Reputation Levels

| Level | Name | Min Points | Benefits |
|-------|------|------------|----------|
| 1 | Newcomer | 0 | Create templates, Write reviews |
| 2 | Contributor | 100 | Feature requests, Beta access |
| 3 | Active Member | 250 | Verified badge eligibility |
| 4 | Trusted User | 500 | Moderate reviews, Priority support |
| 5 | Expert | 1,000 | Featured content, Community leadership |
| 6 | Master | 2,500 | Template verification, Mentor program |
| 7 | Legend | 5,000 | Platform advisory, Special recognition |
| 8 | Hall of Fame | 10,000 | Platform governance, Legacy status |

## Badge Categories

### Contribution Badges
- **First Template** (Bronze) - Create your first template
- **Template Master** (Gold) - Create 10 high-quality templates
- **Prolific Creator** (Platinum) - Create 50+ templates

### Quality Badges
- **Five Star Creator** (Silver) - Receive a perfect 5-star rating
- **Quality Master** (Platinum) - Maintain 4.5+ average across 5+ templates
- **Consistency Champion** (Gold) - Maintain quality over time

### Community Badges
- **Helpful Reviewer** (Silver) - Write 25 helpful reviews
- **Community Leader** (Gold) - Help 100 community members
- **Mentor** (Platinum) - Guide new community members

### Milestone Badges
- **Reputation Hero** (Silver) - Reach 1,000 reputation points
- **Reputation Legend** (Gold) - Reach 5,000 reputation points
- **Hall of Fame** (Special) - Reach maximum reputation level

## Privacy Controls

### Profile Visibility Options
- **Public** - Visible to everyone (default)
- **Community** - Visible to logged-in community members only
- **Private** - Visible only to the user themselves

### Granular Privacy Settings
- Show/hide email address
- Show/hide real name vs display name
- Show/hide location information
- Show/hide company information
- Allow/disable direct messages
- Show/hide activity feed

## Security Features

### Anti-Gaming Protection
- **Rapid point gain detection** - Flags suspicious reputation increases
- **Review pattern analysis** - Detects fake review patterns
- **Source diversity scoring** - Ensures balanced point sources
- **Peer validation** - Community validation of contributions

### Rate Limiting
- **Profile updates**: 5 requests per minute
- **Reputation recalculation**: 3 requests per hour (users), 10 per hour (admins)
- **Search requests**: 10 requests per minute
- **Profile views**: 30 requests per minute

## GDPR Compliance

### Data Protection Features
- **Explicit consent tracking** for data collection
- **Data retention policies** with automatic cleanup
- **Right to be forgotten** with complete data deletion
- **Data portability** with full profile export
- **Privacy-by-design** with minimal data collection
- **Transparent privacy controls** for users

### Data Anonymization
- **Request anonymization** option for users
- **Automated data cleanup** after retention periods
- **Secure data deletion** with verification

## Installation and Setup

### 1. Database Schema Setup

Run the community schema extensions to create required tables:

```sql
-- Execute the SQL file to create community tables
\i apps/sim/db/community-schema-extensions.sql
```

### 2. Environment Configuration

No additional environment variables are required. The system uses existing Sim authentication and database configuration.

### 3. API Integration

The community APIs are automatically available once the schema is deployed:

```typescript
// Initialize reputation system
const reputationSystem = CommunityReputationSystem.getInstance()

// Calculate reputation for all users (run once during setup)
await reputationSystem.batchCalculateReputation(allUserIds)
```

## Development

### Running Tests

```bash
# Run community system tests
npm test -- community

# Run with coverage
npm run test:coverage -- community
```

### Type Checking

```bash
# Check types for community modules
npm run type-check
```

### Database Migrations

```bash
# Apply community schema extensions
npm run db:push

# Open database studio to inspect community tables
npm run db:studio
```

## Contributing

### Code Standards
- **TypeScript strict mode** with comprehensive type safety
- **Comprehensive JSDoc** documentation for all public methods
- **Error handling** with detailed logging and user-friendly messages
- **Production-ready** code with no placeholders or TODOs
- **Privacy-first** design with GDPR compliance
- **Security-conscious** implementation with rate limiting and validation

### Testing Requirements
- **Unit tests** for all reputation calculation logic
- **Integration tests** for API endpoints
- **Component tests** for React components
- **Privacy tests** for access control logic
- **Performance tests** for reputation calculations

## Monitoring and Analytics

### Reputation System Monitoring
- **Calculation performance** tracking
- **Anti-gaming detection** alerts
- **Badge award frequency** analysis
- **User engagement** metrics

### Community Health Metrics
- **Active user growth** tracking
- **Template contribution** rates
- **Community interaction** levels
- **Quality score** trends

## Troubleshooting

### Common Issues

#### Reputation Not Calculating
1. Check database connection and schema
2. Verify user has activities to calculate from
3. Run manual recalculation via API
4. Check logs for calculation errors

#### Profile Privacy Issues
1. Verify user privacy settings
2. Check authentication status
3. Confirm profile visibility rules
4. Review access control logic

#### Badge Awards Not Working
1. Check badge criteria configuration
2. Verify user meets requirements
3. Run reputation recalculation
4. Check badge award logs

### Debug Mode

Enable detailed logging by setting:
```typescript
// In development, reputation system provides detailed logging
const reputationSystem = CommunityReputationSystem.getInstance()
```

## Support

For technical support, feature requests, or bug reports:
- Create an issue in the Sim repository
- Include reproduction steps and error logs
- Tag as `community-system` for proper routing

## License

This community user management system is part of the Sim platform and follows the same licensing terms as the main project.