'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { 
  ArrowRight, 
  Target, 
  FileText, 
  Sparkles, 
  BarChart3, 
  Calendar, 
  Shield,
  Users,
  Clock,
  CheckCircle2
} from 'lucide-react'

export default function LandingPage() {
  const { data: session } = useSession()

  return (
    <main className="min-h-screen">
      {/* Hero Section with gradient background - Main call-to-action area */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="relative container mx-auto px-4 py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            {/* Main headline - Clear value proposition */}
            <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
              Land Your Dream Job
              <span className="block text-blue-200">With AI-Powered Automation</span>
            </h1>
            
            {/* Subheading with specific benefits and metrics */}
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Automate job searching, resume tailoring, and application tracking.
              Save 10+ hours per week while increasing your interview rate by 3x.
            </p>
            
            {/* Call-to-action buttons - Conditional rendering based on auth state */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {session ? (
                <Link href="/dashboard">
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/auth/signup">
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                      Start Free Trial
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/auth/signin">
                    <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
            
            {/* Trust indicators - Build confidence with social proof */}
            <div className="mt-12 flex items-center justify-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-green-400" />
                <span>Join 10,000+ Job Seekers</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-400" />
                <span>Setup in 5 Minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Showcase main platform capabilities */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Land Your Next Job
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features that automate your job search from start to finish
            </p>
          </div>
          
          {/* Feature grid - 6 core features with icons and descriptions */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Job Aggregation feature - Search across multiple job boards */}
            <Card className="hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Job Aggregation</h3>
                <p className="text-gray-600">
                  Search across multiple job boards simultaneously. Our AI finds relevant 
                  positions from USAJOBS, RemoteOK, Remotive, and more.
                </p>
              </CardContent>
            </Card>
            
            {/* Resume Tailoring feature - AI-powered optimization */}
            <Card className="hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">AI Resume Tailoring</h3>
                <p className="text-gray-600">
                  Automatically customize your resume for each job. Our AI optimizes 
                  keywords and reorders content to maximize ATS scores.
                </p>
              </CardContent>
            </Card>
            
            {/* Cover Letter feature - Personalized generation */}
            <Card className="hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Cover Letter Generator</h3>
                <p className="text-gray-600">
                  Generate personalized cover letters in seconds. Choose from templates 
                  and adjust tone to match company culture.
                </p>
              </CardContent>
            </Card>
            
            {/* Application Tracking feature - Kanban board management */}
            <Card className="hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Application Tracking</h3>
                <p className="text-gray-600">
                  Track all your applications in one place. Kanban board view with 
                  status updates, notes, and interview scheduling.
                </p>
              </CardContent>
            </Card>
            
            {/* Calendar Integration feature - Interview scheduling */}
            <Card className="hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                  <Calendar className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Calendar Integration</h3>
                <p className="text-gray-600">
                  Sync with Google and Outlook calendars. Never miss an interview with 
                  automated reminders and conflict detection.
                </p>
              </CardContent>
            </Card>
            
            {/* Quality Assurance feature - Document validation */}
            <Card className="hover:shadow-xl transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Quality Assurance</h3>
                <p className="text-gray-600">
                  Built-in ATS scoring, grammar checking, and readability analysis. 
                  Ensure your applications are perfect before sending.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section - 4-step process explanation */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in minutes with our simple 4-step process
            </p>
          </div>
          
          {/* Process steps - Visual workflow representation */}
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8">
              {/* Step 1 - Upload resume */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  1
                </div>
                <h3 className="font-semibold mb-2">Upload Your Resume</h3>
                <p className="text-sm text-gray-600">
                  Upload your existing resume or create one with our builder
                </p>
              </div>
              
              {/* Step 2 - Set preferences */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  2
                </div>
                <h3 className="font-semibold mb-2">Set Preferences</h3>
                <p className="text-sm text-gray-600">
                  Define your job criteria, salary range, and location preferences
                </p>
              </div>
              
              {/* Step 3 - AI automation */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  3
                </div>
                <h3 className="font-semibold mb-2">AI Does the Work</h3>
                <p className="text-sm text-gray-600">
                  Our AI finds jobs, tailors resumes, and generates cover letters
                </p>
              </div>
              
              {/* Step 4 - Track applications */}
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  4
                </div>
                <h3 className="font-semibold mb-2">Track & Apply</h3>
                <p className="text-sm text-gray-600">
                  Review tailored documents and track applications in one dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Final call-to-action with gradient background */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Accelerate Your Job Search?
          </h2>
          <p className="text-xl mb-8">
            Join thousands of job seekers who've landed their dream jobs faster
          </p>
          {session ? (
            <Link href="/dashboard">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                Go to Dashboard
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Link href="/auth/signup">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer - Links and company information */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Brand column - Company description */}
            <div>
              <h3 className="text-white font-bold text-lg mb-4">JobAI</h3>
              <p className="text-sm">
                AI-powered job application platform that helps you land your dream job faster.
              </p>
            </div>
            
            {/* Product column - Product-related links */}
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-white">Integrations</Link></li>
                <li><Link href="/changelog" className="hover:text-white">Changelog</Link></li>
              </ul>
            </div>
            
            {/* Resources column - Help and documentation */}
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/guides" className="hover:text-white">Guides</Link></li>
                <li><Link href="/templates" className="hover:text-white">Templates</Link></li>
                <li><Link href="/api" className="hover:text-white">API Docs</Link></li>
              </ul>
            </div>
            
            {/* Company column - About and legal */}
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          
          {/* Copyright - Bottom footer */}
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2024 JobAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  )
}