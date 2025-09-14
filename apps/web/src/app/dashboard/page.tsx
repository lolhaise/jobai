import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ApplicationDashboard } from '@/components/dashboard/ApplicationDashboard'
import { FollowUpReminders } from '@/components/dashboard/FollowUpReminders'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  BriefcaseIcon,
  FileTextIcon,
  TrendingUpIcon,
  ClockIcon,
  PlusCircleIcon,
  SearchIcon,
  CalendarIcon,
  BellIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon,
  ChevronRightIcon
} from 'lucide-react'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header section with welcome message and quick actions */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 md:py-6">
          <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0">
            <div>
              {/* Personalized greeting based on time of day - responsive text sizes */}
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                Welcome back, {session.user?.name || 'there'}!
              </h1>
              <p className="text-sm md:text-base text-gray-600 mt-1">
                Here's your job search overview for today
              </p>
            </div>
            {/* Quick action buttons - responsive layout */}
            <div className="flex gap-2 md:gap-3">
              <Link href="/jobs/search" className="flex-1 md:flex-initial">
                <Button variant="outline" className="w-full md:w-auto text-xs md:text-sm">
                  <SearchIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Search Jobs</span>
                  <span className="sm:hidden">Search</span>
                </Button>
              </Link>
              <Link href="/resumes/new" className="flex-1 md:flex-initial">
                <Button className="w-full md:w-auto text-xs md:text-sm">
                  <PlusCircleIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Upload Resume</span>
                  <span className="sm:hidden">Upload</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Key metrics grid - responsive 4 primary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          {/* Total Applications metric card - mobile optimized */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                <span className="hidden md:inline">Total Applications</span>
                <span className="md:hidden">Applications</span>
              </CardTitle>
              <BriefcaseIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="text-lg md:text-2xl font-bold">47</div>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpIcon className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                <span className="hidden sm:inline">+12% from last week</span>
                <span className="sm:hidden">+12%</span>
              </div>
            </CardContent>
          </Card>

          {/* Interview Rate metric card - mobile optimized */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                <span className="hidden md:inline">Interview Rate</span>
                <span className="md:hidden">Interviews</span>
              </CardTitle>
              <TrendingUpIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="text-lg md:text-2xl font-bold">23%</div>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpIcon className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                <span className="hidden sm:inline">+5% improvement</span>
                <span className="sm:hidden">+5%</span>
              </div>
            </CardContent>
          </Card>

          {/* Response Time metric card - mobile optimized */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                <span className="hidden md:inline">Avg. Response Time</span>
                <span className="md:hidden">Response</span>
              </CardTitle>
              <ClockIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="text-lg md:text-2xl font-bold">
                <span className="hidden sm:inline">3.2 days</span>
                <span className="sm:hidden">3.2d</span>
              </div>
              <div className="flex items-center text-xs text-yellow-600">
                <MinusIcon className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                <span className="hidden sm:inline">Same as last week</span>
                <span className="sm:hidden">Same</span>
              </div>
            </CardContent>
          </Card>

          {/* Tailored Resumes metric card - mobile optimized */}
          <Card className="hover:shadow-sm transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 md:px-6 pt-3 md:pt-6">
              <CardTitle className="text-xs md:text-sm font-medium truncate">
                <span className="hidden md:inline">Tailored Resumes</span>
                <span className="md:hidden">Resumes</span>
              </CardTitle>
              <FileTextIcon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
              <div className="text-lg md:text-2xl font-bold">28</div>
              <div className="flex items-center text-xs text-blue-600">
                <ArrowUpIcon className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                <span className="hidden sm:inline">+7 this week</span>
                <span className="sm:hidden">+7</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions section - mobile responsive */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-base md:text-lg font-semibold mb-3 md:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Find Jobs action card - mobile touch friendly */}
            <Link href="/jobs/search">
              <Card className="hover:shadow-md transition-shadow cursor-pointer active:scale-95 transform">
                <CardContent className="flex flex-col items-center justify-center p-4 md:p-6 min-h-[80px] md:min-h-[100px]">
                  <SearchIcon className="h-6 w-6 md:h-8 md:w-8 text-blue-600 mb-1 md:mb-2" />
                  <span className="text-xs md:text-sm font-medium text-center">Find Jobs</span>
                </CardContent>
              </Card>
            </Link>

            {/* Tailor Resume action card - mobile touch friendly */}
            <Link href="/resumes/tailor">
              <Card className="hover:shadow-md transition-shadow cursor-pointer active:scale-95 transform">
                <CardContent className="flex flex-col items-center justify-center p-4 md:p-6 min-h-[80px] md:min-h-[100px]">
                  <FileTextIcon className="h-6 w-6 md:h-8 md:w-8 text-green-600 mb-1 md:mb-2" />
                  <span className="text-xs md:text-sm font-medium text-center">Tailor Resume</span>
                </CardContent>
              </Card>
            </Link>

            {/* Track Applications action card - mobile touch friendly */}
            <Link href="/applications">
              <Card className="hover:shadow-md transition-shadow cursor-pointer active:scale-95 transform">
                <CardContent className="flex flex-col items-center justify-center p-4 md:p-6 min-h-[80px] md:min-h-[100px]">
                  <BriefcaseIcon className="h-6 w-6 md:h-8 md:w-8 text-purple-600 mb-1 md:mb-2" />
                  <span className="text-xs md:text-sm font-medium text-center">Track Apps</span>
                </CardContent>
              </Card>
            </Link>

            {/* Schedule Interview action card - mobile touch friendly */}
            <Link href="/calendar">
              <Card className="hover:shadow-md transition-shadow cursor-pointer active:scale-95 transform">
                <CardContent className="flex flex-col items-center justify-center p-4 md:p-6 min-h-[80px] md:min-h-[100px]">
                  <CalendarIcon className="h-6 w-6 md:h-8 md:w-8 text-orange-600 mb-1 md:mb-2" />
                  <span className="text-xs md:text-sm font-medium text-center">Schedule</span>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

        {/* Main dashboard content - responsive layout */}
        <div className="grid lg:grid-cols-3 gap-4 md:gap-8">
          {/* Application Dashboard - full width on mobile */}
          <div className="lg:col-span-2">
            <ApplicationDashboard />
          </div>
          
          {/* Follow-up Reminders sidebar - full width on mobile */}
          <div className="space-y-4 md:space-y-6">
            <FollowUpReminders />
            
            {/* Recent Activity section - mobile optimized */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base md:text-lg flex items-center">
                    <BellIcon className="h-4 w-4 md:h-5 md:w-5 mr-2" />
                    Recent Activity
                  </CardTitle>
                  <Link href="/activity" className="md:hidden">
                    <Button variant="ghost" size="sm" className="text-xs">
                      View All
                      <ChevronRightIcon className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Activity item 1 - mobile optimized */}
                  <div className="flex items-start space-x-3 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">Interview scheduled</p>
                      <p className="text-gray-500 truncate">Google - Senior Developer</p>
                      <p className="text-xs text-gray-400">2 hours ago</p>
                    </div>
                  </div>
                  
                  {/* Activity item 2 - mobile optimized */}
                  <div className="flex items-start space-x-3 text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">Resume tailored</p>
                      <p className="text-gray-500 truncate">Microsoft - Product Manager</p>
                      <p className="text-xs text-gray-400">5 hours ago</p>
                    </div>
                  </div>
                  
                  {/* Activity item 3 - mobile optimized */}
                  <div className="flex items-start space-x-3 text-sm">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">Application submitted</p>
                      <p className="text-gray-500 truncate">Meta - Data Scientist</p>
                      <p className="text-xs text-gray-400">1 day ago</p>
                    </div>
                  </div>
                  
                  {/* Activity item 4 - mobile optimized */}
                  <div className="flex items-start space-x-3 text-sm">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">Follow-up reminder</p>
                      <p className="text-gray-500 truncate">Apple - iOS Developer</p>
                      <p className="text-xs text-gray-400">2 days ago</p>
                    </div>
                  </div>
                </div>
                
                {/* View all activity link - desktop only */}
                <div className="mt-4 hidden md:block">
                  <Link href="/activity">
                    <Button variant="ghost" className="w-full">
                      View All Activity
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}