import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Welcome to JobAI!</h2>
          <p className="mt-2 text-gray-600">
            Let's set up your profile to get started with automating your job search.
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Next Steps:</h3>
            <ol className="mt-4 space-y-3 list-decimal list-inside text-gray-600">
              <li>Complete your profile information</li>
              <li>Upload your resume</li>
              <li>Set your job preferences</li>
              <li>Connect to job boards</li>
            </ol>
          </div>
          
          <div className="pt-6 border-t">
            <a
              href="/dashboard"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}