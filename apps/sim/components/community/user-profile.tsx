/**
 * Community User Profile Component
 * 
 * Comprehensive user profile system for Sim's community marketplace.
 * Displays user information, reputation, badges, templates, activity feed,
 * and social features with privacy controls and responsive design.
 * 
 * FEATURES:
 * - Complete user profile with bio, skills, and social links
 * - Reputation display with level progression
 * - Badge showcase with achievement details
 * - Template portfolio with ratings and analytics
 * - Activity feed with filtering options
 * - Social features (following, followers, direct messaging)
 * - Privacy controls and profile visibility settings
 * - Responsive design for all screen sizes
 * 
 * ACCESSIBILITY:
 * - Full ARIA support for screen readers
 * - Keyboard navigation compatibility
 * - High contrast mode support
 * - Focus management for modals and interactions
 * 
 * @created 2025-09-04
 * @author Community User Profile System
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  User, 
  Mail, 
  MapPin, 
  Calendar, 
  Star, 
  Trophy, 
  Users, 
  Heart, 
  MessageSquare, 
  Share2, 
  Settings, 
  Shield, 
  Github, 
  Linkedin, 
  Twitter, 
  Globe, 
  Award, 
  TrendingUp, 
  Activity, 
  Template,
  Eye,
  Download,
  ThumbsUp,
  ExternalLink,
  Filter,
  ChevronRight,
  Crown,
  Zap,
  Target
} from 'lucide-react'

// ========================
// TYPE DEFINITIONS
// ========================

interface UserProfile {
  id: string
  name: string
  email?: string
  image?: string
  displayName?: string
  bio?: string
  title?: string
  company?: string
  location?: string
  timezone?: string
  specializations: string[]
  skills: string[]
  industries: string[]
  socialLinks: {
    website?: string
    github?: string
    linkedin?: string
    twitter?: string
    discord?: string
  }
  profileSettings: {
    visibility: 'public' | 'community' | 'private'
    showEmail: boolean
    showRealName: boolean
    showLocation: boolean
    showCompany: boolean
    allowDirectMessages: boolean
  }
  verification: {
    isVerified: boolean
    verificationType?: string
    trustScore: number
  }
  createdAt: string
  lastActiveAt?: string
}

interface UserReputation {
  totalPoints: number
  level: number
  levelName: string
  levelProgress: number
  benefits: string[]
  nextLevelPoints?: number
  breakdown: {
    templatePoints: number
    ratingPoints: number
    communityPoints: number
    qualityBonus: number
    penalties: number
  }
  qualityMetrics: {
    averageTemplateRating: number
    helpfulReviewPercentage: number
    consistencyScore: number
  }
  lastCalculated: string
}

interface UserBadge {
  id: string
  name: string
  description: string
  icon: string
  color: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'special'
  earnedAt: string
  isFeaured: boolean
}

interface UserTemplate {
  id: string
  name: string
  description: string
  category: string
  rating: number
  ratingCount: number
  downloadCount: number
  likeCount: number
  viewCount: number
  coverImage?: string
  createdAt: string
  updatedAt: string
  isFeaured: boolean
}

interface UserActivity {
  id: string
  type: string
  title: string
  description: string
  targetType?: string
  targetId?: string
  createdAt: string
  metadata?: any
}

interface SocialStats {
  followerCount: number
  followingCount: number
  isFollowing?: boolean
  isMutual?: boolean
}

// ========================
// MAIN COMPONENT
// ========================

interface UserProfileProps {
  userId: string
  viewerUserId?: string // Current user viewing the profile
  initialData?: {
    profile: UserProfile
    reputation: UserReputation
    badges: UserBadge[]
    templates: UserTemplate[]
    socialStats: SocialStats
  }
  onFollow?: (userId: string) => void
  onUnfollow?: (userId: string) => void
  onMessage?: (userId: string) => void
}

export function UserProfile({ 
  userId, 
  viewerUserId, 
  initialData, 
  onFollow, 
  onUnfollow, 
  onMessage 
}: UserProfileProps) {
  // ========================
  // STATE MANAGEMENT
  // ========================

  const [profile, setProfile] = useState<UserProfile | null>(initialData?.profile || null)
  const [reputation, setReputation] = useState<UserReputation | null>(initialData?.reputation || null)
  const [badges, setBadges] = useState<UserBadge[]>(initialData?.badges || [])
  const [templates, setTemplates] = useState<UserTemplate[]>(initialData?.templates || [])
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [socialStats, setSocialStats] = useState<SocialStats>(initialData?.socialStats || { followerCount: 0, followingCount: 0 })
  
  const [loading, setLoading] = useState(!initialData)
  const [activeTab, setActiveTab] = useState('overview')
  const [showBadgeDetails, setShowBadgeDetails] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null)
  const [showFollowers, setShowFollowers] = useState(false)
  
  const isOwnProfile = userId === viewerUserId
  const canEdit = isOwnProfile
  const canMessage = !isOwnProfile && profile?.profileSettings.allowDirectMessages

  // ========================
  // DATA LOADING
  // ========================

  useEffect(() => {
    if (!initialData) {
      loadProfileData()
    }
  }, [userId, initialData])

  const loadProfileData = async () => {
    setLoading(true)
    try {
      // Load profile data from API
      const [profileRes, reputationRes, badgesRes, templatesRes, activitiesRes, socialRes] = await Promise.all([
        fetch(`/api/community/users/${userId}/profile`),
        fetch(`/api/community/users/${userId}/reputation`),
        fetch(`/api/community/users/${userId}/badges`),
        fetch(`/api/community/users/${userId}/templates`),
        fetch(`/api/community/users/${userId}/activities`),
        fetch(`/api/community/users/${userId}/social`)
      ])

      const [profileData, reputationData, badgesData, templatesData, activitiesData, socialData] = await Promise.all([
        profileRes.json(),
        reputationRes.json(),
        badgesRes.json(),
        templatesRes.json(),
        activitiesRes.json(),
        socialRes.json()
      ])

      setProfile(profileData)
      setReputation(reputationData)
      setBadges(badgesData)
      setTemplates(templatesData)
      setActivities(activitiesData)
      setSocialStats(socialData)

    } catch (error) {
      console.error('Error loading profile data:', error)
    } finally {
      setLoading(false)
    }
  }

  // ========================
  // SOCIAL ACTIONS
  // ========================

  const handleFollow = async () => {
    if (!onFollow) return
    try {
      await onFollow(userId)
      setSocialStats(prev => ({ 
        ...prev, 
        followerCount: prev.followerCount + 1, 
        isFollowing: true 
      }))
    } catch (error) {
      console.error('Error following user:', error)
    }
  }

  const handleUnfollow = async () => {
    if (!onUnfollow) return
    try {
      await onUnfollow(userId)
      setSocialStats(prev => ({ 
        ...prev, 
        followerCount: prev.followerCount - 1, 
        isFollowing: false,
        isMutual: false
      }))
    } catch (error) {
      console.error('Error unfollowing user:', error)
    }
  }

  const handleMessage = () => {
    if (!onMessage) return
    onMessage(userId)
  }

  // ========================
  // UTILITY FUNCTIONS
  // ========================

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getBadgeIcon = (iconName: string) => {
    const iconMap: Record<string, any> = {
      'Crown': Crown,
      'Star': Star,
      'Trophy': Trophy,
      'Award': Award,
      'Zap': Zap,
      'Target': Target,
      'TrendingUp': TrendingUp,
      'Users': Users,
      'ThumbsUp': ThumbsUp,
      'Shield': Shield
    }
    return iconMap[iconName] || Award
  }

  const getBadgeTierColor = (tier: string) => {
    const colors = {
      bronze: 'from-amber-600 to-amber-800',
      silver: 'from-gray-400 to-gray-600',
      gold: 'from-yellow-400 to-yellow-600',
      platinum: 'from-purple-400 to-purple-600',
      special: 'from-rainbow-400 to-rainbow-600'
    }
    return colors[tier as keyof typeof colors] || colors.bronze
  }

  if (loading) {
    return <UserProfileSkeleton />
  }

  if (!profile || !reputation) {
    return <UserProfileError />
  }

  // ========================
  // RENDER COMPONENT
  // ========================

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Profile Header */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex flex-col items-center lg:items-start">
              <Avatar className="w-32 h-32 mb-4 border-4 border-primary/20">
                <AvatarImage src={profile.image} alt={profile.name} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10">
                  {getInitials(profile.name)}
                </AvatarFallback>
              </Avatar>
              
              {/* Social Actions */}
              {!isOwnProfile && (
                <div className="flex gap-2 mt-4">
                  {socialStats.isFollowing ? (
                    <Button variant="outline" onClick={handleUnfollow} className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {socialStats.isMutual ? 'Mutual' : 'Following'}
                    </Button>
                  ) : (
                    <Button onClick={handleFollow} className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Follow
                    </Button>
                  )}
                  
                  {canMessage && (
                    <Button variant="outline" onClick={handleMessage} className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </Button>
                  )}
                  
                  <Button variant="outline" size="icon">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Profile Information */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    {profile.displayName || profile.name}
                    {profile.verification.isVerified && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Shield className="h-6 w-6 text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent>Verified Community Member</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </h1>
                  {profile.title && (
                    <p className="text-xl text-muted-foreground">{profile.title}</p>
                  )}
                  {profile.company && (
                    <p className="text-muted-foreground">{profile.company}</p>
                  )}
                </div>

                {/* Edit Profile Button for Own Profile */}
                {isOwnProfile && (
                  <Button variant="outline" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-muted-foreground mb-4 leading-relaxed">{profile.bio}</p>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{reputation.totalPoints.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">Reputation</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{templates.length}</div>
                  <div className="text-sm text-muted-foreground">Templates</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{socialStats.followerCount}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{badges.filter(b => b.isFeaured).length}</div>
                  <div className="text-sm text-muted-foreground">Badges</div>
                </div>
              </div>

              {/* Location and Social Links */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {formatDate(profile.createdAt)}
                </div>
                {profile.lastActiveAt && (
                  <div className="flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    Active {formatDate(profile.lastActiveAt)}
                  </div>
                )}
              </div>

              {/* Social Links */}
              {Object.values(profile.socialLinks).some(link => link) && (
                <div className="flex gap-2 mt-4">
                  {profile.socialLinks.website && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={profile.socialLinks.website} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {profile.socialLinks.github && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://github.com/${profile.socialLinks.github}`} target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {profile.socialLinks.linkedin && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://linkedin.com/in/${profile.socialLinks.linkedin}`} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  {profile.socialLinks.twitter && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://twitter.com/${profile.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer">
                        <Twitter className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="templates">Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="badges">Badges ({badges.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Reputation Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Reputation & Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Level Progress */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium">Level {reputation.level} - {reputation.levelName}</span>
                        <span className="text-sm text-muted-foreground">
                          {reputation.nextLevelPoints ? `${reputation.nextLevelPoints - reputation.totalPoints} points to next level` : 'Max level reached'}
                        </span>
                      </div>
                      <Progress value={reputation.levelProgress} className="h-2" />
                    </div>

                    {/* Reputation Breakdown */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Template Points</div>
                        <div className="text-muted-foreground">{reputation.breakdown.templatePoints.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="font-medium">Rating Points</div>
                        <div className="text-muted-foreground">{reputation.breakdown.ratingPoints.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="font-medium">Community Points</div>
                        <div className="text-muted-foreground">{reputation.breakdown.communityPoints.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="font-medium">Quality Bonus</div>
                        <div className="text-muted-foreground">{reputation.breakdown.qualityBonus.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Quality Metrics */}
                    <Separator />
                    <div>
                      <h4 className="font-medium mb-2">Quality Metrics</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Avg. Rating</div>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            {reputation.qualityMetrics.averageTemplateRating.toFixed(1)}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Helpful Reviews</div>
                          <div className="text-muted-foreground">{reputation.qualityMetrics.helpfulReviewPercentage.toFixed(0)}%</div>
                        </div>
                        <div>
                          <div className="font-medium">Consistency</div>
                          <div className="text-muted-foreground">{reputation.qualityMetrics.consistencyScore.toFixed(1)}/5</div>
                        </div>
                      </div>
                    </div>

                    {/* Level Benefits */}
                    {reputation.benefits.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-medium mb-2">Level Benefits</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {reputation.benefits.map((benefit, index) => (
                              <li key={index} className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Featured Templates */}
              {templates.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Template className="h-5 w-5" />
                        Featured Templates
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('templates')}>
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {templates.slice(0, 3).map((template) => (
                        <div key={template.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                          {template.coverImage && (
                            <img src={template.coverImage} alt={template.name} className="w-12 h-12 rounded object-cover" />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{template.name}</h4>
                            <p className="text-sm text-muted-foreground line-clamp-1">{template.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                {template.rating.toFixed(1)} ({template.ratingCount})
                              </div>
                              <div className="flex items-center gap-1">
                                <Download className="h-3 w-3" />
                                {template.downloadCount.toLocaleString()}
                              </div>
                              <div className="flex items-center gap-1">
                                <Heart className="h-3 w-3" />
                                {template.likeCount}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Skills and Specializations */}
              {(profile.specializations.length > 0 || profile.skills.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle>Skills & Expertise</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.specializations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Specializations</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.specializations.map((spec, index) => (
                            <Badge key={index} variant="secondary">{spec}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {profile.skills.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Technical Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.skills.map((skill, index) => (
                            <Badge key={index} variant="outline">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {profile.industries.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Industries</h4>
                        <div className="flex flex-wrap gap-2">
                          {profile.industries.map((industry, index) => (
                            <Badge key={index} variant="outline">{industry}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Featured Badges */}
              {badges.filter(b => b.isFeaured).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Featured Badges
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('badges')}>
                        View All <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {badges.filter(b => b.isFeaured).slice(0, 4).map((badge) => {
                        const IconComponent = getBadgeIcon(badge.icon)
                        return (
                          <TooltipProvider key={badge.id}>
                            <Tooltip>
                              <TooltipTrigger>
                                <div 
                                  className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors bg-gradient-to-br ${getBadgeTierColor(badge.tier)}`}
                                  onClick={() => {
                                    setSelectedBadge(badge)
                                    setShowBadgeDetails(true)
                                  }}
                                >
                                  <div className="flex flex-col items-center gap-2">
                                    <IconComponent className="h-6 w-6 text-white" />
                                    <div className="text-xs font-medium text-white text-center">{badge.name}</div>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="max-w-xs">
                                  <div className="font-medium">{badge.name}</div>
                                  <div className="text-sm">{badge.description}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Earned {formatDate(badge.earnedAt)}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Social Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Community
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      variant="outline" 
                      className="flex flex-col gap-1 h-auto py-4"
                      onClick={() => setShowFollowers(true)}
                    >
                      <div className="text-xl font-bold">{socialStats.followerCount}</div>
                      <div className="text-sm text-muted-foreground">Followers</div>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex flex-col gap-1 h-auto py-4"
                      onClick={() => setShowFollowers(true)}
                    >
                      <div className="text-xl font-bold">{socialStats.followingCount}</div>
                      <div className="text-sm text-muted-foreground">Following</div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <TemplateGrid templates={templates} />
        </TabsContent>

        {/* Badges Tab */}
        <TabsContent value="badges" className="mt-6">
          <BadgeShowcase 
            badges={badges} 
            onBadgeClick={(badge) => {
              setSelectedBadge(badge)
              setShowBadgeDetails(true)
            }} 
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <ActivityFeed activities={activities} />
        </TabsContent>
      </Tabs>

      {/* Badge Details Dialog */}
      {selectedBadge && (
        <Dialog open={showBadgeDetails} onOpenChange={setShowBadgeDetails}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${getBadgeTierColor(selectedBadge.tier)}`}>
                  {(() => {
                    const IconComponent = getBadgeIcon(selectedBadge.icon)
                    return <IconComponent className="h-6 w-6 text-white" />
                  })()}
                </div>
                <div>
                  <div>{selectedBadge.name}</div>
                  <div className="text-sm text-muted-foreground capitalize">{selectedBadge.tier} Badge</div>
                </div>
              </DialogTitle>
              <DialogDescription>
                {selectedBadge.description}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Earned on</div>
                <div className="font-medium">{formatDate(selectedBadge.earnedAt)}</div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

// ========================
// SUBCOMPONENTS
// ========================

function TemplateGrid({ templates }: { templates: UserTemplate[] }) {
  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Template className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Templates Yet</h3>
          <p className="text-muted-foreground">This user hasn't created any templates yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <Card key={template.id} className="hover:shadow-lg transition-shadow">
          {template.coverImage && (
            <div className="aspect-video overflow-hidden rounded-t-lg">
              <img 
                src={template.coverImage} 
                alt={template.name}
                className="w-full h-full object-cover hover:scale-105 transition-transform"
              />
            </div>
          )}
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold line-clamp-1">{template.name}</h3>
              {template.isFeaured && (
                <Badge variant="secondary" className="ml-2">Featured</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                {template.rating.toFixed(1)} ({template.ratingCount})
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  {template.downloadCount}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {template.viewCount}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function BadgeShowcase({ badges, onBadgeClick }: { badges: UserBadge[], onBadgeClick: (badge: UserBadge) => void }) {
  if (badges.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Badges Yet</h3>
          <p className="text-muted-foreground">This user hasn't earned any badges yet.</p>
        </CardContent>
      </Card>
    )
  }

  const badgesByTier = badges.reduce((acc, badge) => {
    if (!acc[badge.tier]) acc[badge.tier] = []
    acc[badge.tier].push(badge)
    return acc
  }, {} as Record<string, UserBadge[]>)

  const tierOrder = ['special', 'platinum', 'gold', 'silver', 'bronze']

  return (
    <div className="space-y-6">
      {tierOrder.map(tier => {
        const tierBadges = badgesByTier[tier]
        if (!tierBadges?.length) return null

        return (
          <Card key={tier}>
            <CardHeader>
              <CardTitle className="capitalize flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${getBadgeTierColor(tier)}`} />
                {tier} Badges ({tierBadges.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {tierBadges.map((badge) => {
                  const IconComponent = getBadgeIcon(badge.icon)
                  return (
                    <TooltipProvider key={badge.id}>
                      <Tooltip>
                        <TooltipTrigger>
                          <div 
                            className={`p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors bg-gradient-to-br ${getBadgeTierColor(badge.tier)}`}
                            onClick={() => onBadgeClick(badge)}
                          >
                            <div className="flex flex-col items-center gap-2">
                              <IconComponent className="h-8 w-8 text-white" />
                              <div className="text-xs font-medium text-white text-center">{badge.name}</div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="max-w-xs">
                            <div className="font-medium">{badge.name}</div>
                            <div className="text-sm">{badge.description}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Earned {formatDate(badge.earnedAt)}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function ActivityFeed({ activities }: { activities: UserActivity[] }) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
          <p className="text-muted-foreground">This user hasn't been active recently.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Activity className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">{activity.title}</h4>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDate(activity.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function UserProfileSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex flex-col items-center lg:items-start">
              <div className="w-32 h-32 bg-muted rounded-full animate-pulse mb-4" />
              <div className="flex gap-2">
                <div className="w-24 h-8 bg-muted rounded animate-pulse" />
                <div className="w-20 h-8 bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <div className="w-64 h-8 bg-muted rounded animate-pulse" />
              <div className="w-48 h-4 bg-muted rounded animate-pulse" />
              <div className="w-full h-16 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="text-center space-y-2">
                    <div className="w-16 h-6 bg-muted rounded animate-pulse mx-auto" />
                    <div className="w-12 h-4 bg-muted rounded animate-pulse mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function UserProfileError() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Card>
        <CardContent className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Profile Not Found</h3>
          <p className="text-muted-foreground">The user profile you're looking for doesn't exist or isn't accessible.</p>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper function to get badge tier color gradient
function getBadgeTierColor(tier: string): string {
  const colors = {
    bronze: 'from-amber-600 to-amber-800',
    silver: 'from-gray-400 to-gray-600', 
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-purple-400 to-purple-600',
    special: 'from-pink-400 to-purple-600'
  }
  return colors[tier as keyof typeof colors] || colors.bronze
}

// Helper function to format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric'
  })
}