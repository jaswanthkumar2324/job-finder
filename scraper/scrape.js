const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

// Configuration
const BASE_URL = 'https://internshala.com';
const LISTING_URL = 'https://internshala.com/jobs/computer-science-jobs';
const PAGES_TO_SCRAPE = 3;
const SLEEP_MS = 1500; // Polite delay between requests

// Headers to mimic a browser
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Connection': 'keep-alive'
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to determine if a location is preferred (Chennai, Hyderabad, Bangalore)
function checkPreferred(locationStr) {
  if (!locationStr) return false;
  const loc = locationStr.toLowerCase();
  return loc.includes('chennai') || loc.includes('hyderabad') || loc.includes('bangalore') || loc.includes('bengaluru');
}

// Clean text helper
function cleanText(text) {
  return text ? text.replace(/\s+/g, ' ').trim() : '';
}

async function run() {
  console.log(`[${new Date().toISOString()}] Starting daily fresher jobs scraper...`);
  
  // Paths for jobs.json
  const scraperDbPath = path.join(__dirname, 'jobs.json');
  // Copy to frontend so it can be committed together
  const frontendDbDir = path.join(__dirname, '..', 'frontend', 'src', 'data');
  const frontendDbPath = path.join(frontendDbDir, 'jobs.json');

  // 1. Load existing jobs
  let jobsMap = new Map();
  if (fs.existsSync(scraperDbPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(scraperDbPath, 'utf8'));
      if (Array.isArray(data)) {
        data.forEach(job => {
          if (job.url) jobsMap.set(job.url, job);
        });
        console.log(`Loaded ${jobsMap.size} existing jobs from database.`);
      }
    } catch (e) {
      console.error('Error loading existing jobs:', e.message);
    }
  }

  // 2. Fetch listing pages
  const listingJobs = [];
  for (let page = 1; page <= PAGES_TO_SCRAPE; page++) {
    const pageUrl = page === 1 ? LISTING_URL : `${LISTING_URL}/page-${page}`;
    console.log(`Fetching listing page ${page}: ${pageUrl}`);
    try {
      const response = await axios.get(pageUrl, { headers });
      const $ = cheerio.load(response.data);
      
      const cards = $('.individual_internship');
      console.log(`Found ${cards.length} job cards on page ${page}.`);
      
      cards.each((index, element) => {
        const card = $(element);
        
        // Extract URL
        let detailUrl = card.attr('data-href') || card.find('a.job-title-href').attr('href');
        if (!detailUrl) return;
        if (!detailUrl.startsWith('http')) {
          detailUrl = BASE_URL + detailUrl;
        }
        
        // Remove tracking queries from URL
        const parsedUrl = new URL(detailUrl);
        parsedUrl.search = '';
        const cleanUrl = parsedUrl.toString();

        // Extract basic card info
        const title = cleanText(card.find('.job-internship-name').text());
        const company = cleanText(card.find('.company-name').text());
        
        // Extract location (handle multiple locations if present)
        const locations = [];
        card.find('.locations a').each((_, locEl) => {
          locations.push($(locEl).text().trim());
        });
        const location = locations.length > 0 ? locations.join(', ') : cleanText(card.find('.locations').text());
        
        // Extract salary
        const salary = cleanText(card.find('.salary_container .desktop').text()) || 
                       cleanText(card.find('.salary_container').text()) || 
                       'Competitive salary';

        listingJobs.push({
          title,
          company,
          location,
          salary,
          url: cleanUrl
        });
      });
      
      await sleep(SLEEP_MS);
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error.message);
    }
  }

  console.log(`Total jobs found in listings: ${listingJobs.length}`);

  // 3. Process each job and fetch detail descriptions if new
  const updatedJobs = [];
  
  for (let i = 0; i < listingJobs.length; i++) {
    const job = listingJobs[i];
    const existingJob = jobsMap.get(job.url);
    
    // Check if we need to fetch details (if job is new or description is missing)
    if (!existingJob || !existingJob.description) {
      console.log(`[New Job ${i + 1}/${listingJobs.length}] Fetching details for: ${job.title} at ${job.company}`);
      try {
        await sleep(SLEEP_MS);
        const detailResponse = await axios.get(job.url, { headers });
        const $d = cheerio.load(detailResponse.data);
        
        let descriptionHtml = '';
        let datePosted = new Date().toISOString().split('T')[0];
        let experience = '0 Years';
        
        // Try parsing JSON-LD Schema first (highly reliable)
        let schemaParsed = false;
        $d('script[type="application/ld+json"]').each((_, scriptEl) => {
          try {
            const content = $d(scriptEl).html();
            if (content.includes('JobPosting')) {
              const schema = JSON.parse(content);
              descriptionHtml = schema.description || '';
              datePosted = schema.datePosted || datePosted;
              experience = schema.experience || '0 Years';
              schemaParsed = true;
            }
          } catch (e) {
            // Ignore parse errors, fallback to HTML parsing
          }
        });
        
        // Fallback HTML Selector Parsing
        if (!schemaParsed || !descriptionHtml) {
          const detailHeading = $d('.detail_heading:contains("About the job")');
          if (detailHeading.length > 0) {
            // Get everything between "About the job" heading and the next main section
            descriptionHtml = detailHeading.next('.text-container').html() || '';
          } else {
            // Generic body backup
            descriptionHtml = $d('.job_description_container').html() || $d('.text-container').html() || '';
          }
        }
        
        // Clean up description HTML slightly (remove absolute styling if needed)
        // Ensure description is not empty
        if (!descriptionHtml) {
          descriptionHtml = '<p>No description available. Please check the apply link for details.</p>';
        }

        const freshJob = {
          ...job,
          description: descriptionHtml,
          is_preferred: checkPreferred(job.location) ? 1 : 0,
          date_posted: datePosted,
          experience: experience,
          date_fetched: new Date().toISOString().split('T')[0]
        };

        updatedJobs.push(freshJob);
        jobsMap.set(job.url, freshJob); // Add to map to prevent duplicates
      } catch (err) {
        console.error(`Failed to fetch details for ${job.url}:`, err.message);
        // Save it with basic info if fetch fails, so we don't try forever
        const failedJob = {
          ...job,
          description: '<p>Failed to load description. Please check the apply link for details.</p>',
          is_preferred: checkPreferred(job.location) ? 1 : 0,
          date_posted: new Date().toISOString().split('T')[0],
          experience: '0 Years',
          date_fetched: new Date().toISOString().split('T')[0]
        };
        updatedJobs.push(failedJob);
      }
    } else {
      // Keep existing job and update basic details if changed on listing page
      const mergedJob = {
        ...existingJob,
        title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        is_preferred: checkPreferred(job.location) ? 1 : 0
      };
      updatedJobs.push(mergedJob);
      jobsMap.set(job.url, mergedJob);
    }
  }

  // 4. Filter jobs: keep only freshers (experience <= 1 year or containing '0' or 'fresher')
  // Internshala is mostly freshers, but double check
  const finalJobs = Array.from(jobsMap.values()).filter(job => {
    // Keep it if it has no experience text or matches fresher keywords
    if (!job.experience) return true;
    const exp = job.experience.toLowerCase();
    return exp.includes('fresher') || exp.includes('0') || exp.includes('1 year') || exp.includes('no experience');
  });

  // 5. Clean up old jobs (older than 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const activeJobs = finalJobs.filter(job => {
    const fetchedDate = new Date(job.date_fetched || job.date_posted);
    return fetchedDate >= thirtyDaysAgo;
  });

  console.log(`Pruned database. Active jobs count: ${activeJobs.length} (from ${finalJobs.length} total)`);

  // 6. Write back to database
  fs.writeFileSync(scraperDbPath, JSON.stringify(activeJobs, null, 2), 'utf8');
  console.log(`Scraper database saved successfully at: ${scraperDbPath}`);

  // Create frontend data directory if it doesn't exist (e.g. running locally)
  if (!fs.existsSync(frontendDbDir)) {
    fs.mkdirSync(frontendDbDir, { recursive: true });
  }
  fs.writeFileSync(frontendDbPath, JSON.stringify(activeJobs, null, 2), 'utf8');
  console.log(`Frontend data copy saved successfully at: ${frontendDbPath}`);
  
  console.log(`[${new Date().toISOString()}] Scraping completed successfully!`);
}

run().catch(err => {
  console.error('Fatal Scraper Error:', err);
  process.exit(1);
});
