import { JobAggregator, JobSearchFilters } from './src';

async function testAPIs() {
  console.log('Testing Job API Integrations...\n');

  // Initialize aggregator without API keys for testing free APIs
  const aggregator = new JobAggregator({
    enabledSources: ['remoteok', 'remotive', 'themuse'],
    cacheEnabled: true,
  });

  // Check available sources
  console.log('Checking API availability...');
  const available = await aggregator.getAvailableSources();
  console.log('Available APIs:', available);

  // Test search with filters
  const filters: JobSearchFilters = {
    keywords: 'software engineer',
    remote: true,
    datePosted: 30, // Last 30 days
  };

  console.log('\nSearching for jobs with filters:', filters);
  console.log('This may take a moment...\n');

  try {
    const jobs = await aggregator.searchAllSources(filters);
    
    console.log(`Found ${jobs.length} total jobs after deduplication\n`);
    
    // Display first 5 jobs
    console.log('Sample jobs:');
    jobs.slice(0, 5).forEach((job, index) => {
      console.log(`\n${index + 1}. ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   Location: ${job.location}`);
      console.log(`   Source: ${job.source}`);
      console.log(`   Posted: ${job.postedDate.toLocaleDateString()}`);
      console.log(`   Remote: ${job.remote ? 'Yes' : 'No'}`);
      console.log(`   Score: ${job.score || 0}`);
      if (job.salary) {
        console.log(`   Salary: $${job.salary.min || '?'} - $${job.salary.max || '?'} ${job.salary.period || ''}`);
      }
    });

    // Test getting a specific job
    if (jobs.length > 0) {
      const firstJob = jobs[0];
      console.log(`\nTesting getJob for ID: ${firstJob.id}`);
      const jobDetail = await aggregator.getJob(firstJob.id);
      if (jobDetail) {
        console.log('Successfully retrieved job details');
      }
    }

  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test
testAPIs().catch(console.error);