import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import rawJobsData from './data/jobs.json';

// Parse unstructured HTML description into structured sections
function parseJobDescription(html) {
  if (!html) return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.querySelector('div');
  
  const sections = [];
  let currentTitle = 'About the Job';
  let currentNodes = [];
  
  container.childNodes.forEach(node => {
    const text = node.textContent.trim();
    
    // Check if the node is a paragraph/heading serving as a section heading
    const isHeading = 
      (node.nodeName === 'P' || node.nodeName === 'H1' || node.nodeName === 'H2' || node.nodeName === 'H3' || node.nodeName === 'H4' || node.nodeName === 'DIV') && 
      (
        text.toLowerCase() === 'about the job:' ||
        text.toLowerCase() === 'about the job' ||
        text.toLowerCase() === 'who can apply:' ||
        text.toLowerCase() === 'who can apply' ||
        text.toLowerCase() === 'salary:' ||
        text.toLowerCase() === 'salary' ||
        text.toLowerCase() === 'experience:' ||
        text.toLowerCase() === 'experience' ||
        text.toLowerCase() === 'deadline:' ||
        text.toLowerCase() === 'deadline' ||
        text.toLowerCase() === 'skills required:' ||
        text.toLowerCase() === 'skills required' ||
        text.toLowerCase() === 'other requirements:' ||
        text.toLowerCase() === 'other requirements' ||
        text.toLowerCase() === 'about company:' ||
        text.toLowerCase() === 'about company' ||
        text.toLowerCase().startsWith('key responsibilities:') ||
        text.toLowerCase().startsWith('key responsibilities')
      ) &&
      text.length < 50; // Heading shouldn't be too long
      
    if (isHeading) {
      if (currentNodes.length > 0) {
        const tempDiv = document.createElement('div');
        currentNodes.forEach(n => tempDiv.appendChild(n));
        if (tempDiv.textContent.trim().length > 0) {
          sections.push({ 
            title: currentTitle, 
            html: tempDiv.innerHTML 
          });
        }
        currentNodes = [];
      }
      currentTitle = text.replace(/:$/, '').trim();
      currentTitle = currentTitle.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    } else {
      currentNodes.push(node.cloneNode(true));
    }
  });
  
  if (currentNodes.length > 0) {
    const tempDiv = document.createElement('div');
    currentNodes.forEach(n => tempDiv.appendChild(n));
    if (tempDiv.textContent.trim().length > 0) {
      sections.push({ 
        title: currentTitle, 
        html: tempDiv.innerHTML 
      });
    }
  }
  
  return sections;
}

const getSectionClassAndIcon = (title) => {
  const t = title.toLowerCase();
  if (t.includes('about the job')) {
    return { className: 'about-the-job', icon: '💼' };
  }
  if (t.includes('who can apply')) {
    return { className: 'who-can-apply', icon: '👥' };
  }
  if (t.includes('skills')) {
    return { className: 'skills-required', icon: '🛠️' };
  }
  if (t.includes('other requirements')) {
    return { className: 'other-requirements', icon: '📋' };
  }
  if (t.includes('key responsibilities') || t.includes('responsibilities')) {
    return { className: 'key-responsibilities', icon: '📝' };
  }
  return { className: 'generic-section', icon: '📌' };
};

function App() {
  const [jobs, setJobs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCity, setActiveCity] = useState('All');
  const [selectedRole, setSelectedRole] = useState('All');
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState('Fresher');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Load jobs on mount
  useEffect(() => {
    // Sort jobs: Preferred locations first, then by date posted descending
    const sorted = [...rawJobsData].sort((a, b) => {
      if (b.is_preferred !== a.is_preferred) {
        return b.is_preferred - a.is_preferred;
      }
      return new Date(b.date_posted || b.date_fetched) - new Date(a.date_posted || a.date_fetched);
    });
    setJobs(sorted);
  }, []);

  // Sync handler (Simulates and displays instructions)
  const handleSyncClick = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setShowSyncModal(true);
    }, 1000);
  };

  // Extract all unique locations for statistics and filters
  const cities = ['All', 'Bangalore', 'Hyderabad', 'Chennai', 'Work From Home', 'Others'];

  // Filter jobs based on search query, active city chip, selected role, and selected experience level
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (job.skills && job.skills.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesCity = true;
      if (activeCity === 'Bangalore') {
        matchesCity = job.location.toLowerCase().includes('bangalore') || job.location.toLowerCase().includes('bengaluru');
      } else if (activeCity === 'Hyderabad') {
        matchesCity = job.location.toLowerCase().includes('hyderabad');
      } else if (activeCity === 'Chennai') {
        matchesCity = job.location.toLowerCase().includes('chennai');
      } else if (activeCity === 'Work From Home') {
        matchesCity = job.location.toLowerCase().includes('work from home') || job.location.toLowerCase().includes('wfh') || job.location.toLowerCase().includes('remote');
      } else if (activeCity === 'Others') {
        const isCommon =
          job.location.toLowerCase().includes('bangalore') ||
          job.location.toLowerCase().includes('bengaluru') ||
          job.location.toLowerCase().includes('hyderabad') ||
          job.location.toLowerCase().includes('chennai') ||
          job.location.toLowerCase().includes('work from home') ||
          job.location.toLowerCase().includes('wfh') ||
          job.location.toLowerCase().includes('remote');
        matchesCity = !isCommon;
      }

      // Check role matches
      let matchesRole = true;
      if (selectedRole !== 'All') {
        const title = job.title.toLowerCase();
        if (selectedRole === 'Software Developer') {
          matchesRole = title.includes('software developer') || title.includes('software engineer') || title.includes('developer') || title.includes('engineer');
        } else if (selectedRole === 'Frontend') {
          matchesRole = title.includes('frontend') || title.includes('front-end') || title.includes('front end') || title.includes('react') || title.includes('web developer');
        } else if (selectedRole === 'Backend') {
          matchesRole = title.includes('backend') || title.includes('back-end') || title.includes('back end') || title.includes('node') || title.includes('django') || title.includes('flask');
        } else if (selectedRole === 'Full Stack') {
          matchesRole = title.includes('fullstack') || title.includes('full-stack') || title.includes('full stack');
        } else if (selectedRole === 'Python') {
          matchesRole = title.includes('python');
        } else if (selectedRole === 'Java') {
          matchesRole = title.includes('java ');
        } else if (selectedRole === 'Mobile') {
          matchesRole = title.includes('android') || title.includes('ios') || title.includes('mobile') || title.includes('flutter') || title.includes('react native');
        } else if (selectedRole === 'Data Science & ML') {
          matchesRole = title.includes('data science') || title.includes('machine learning') || title.includes('ml') || title.includes('ai') || title.includes('data analyst') || title.includes('data engineer');
        } else if (selectedRole === 'Others') {
          const categories = ['software developer', 'software engineer', 'developer', 'engineer', 'frontend', 'front-end', 'front end', 'react', 'web developer', 'backend', 'back-end', 'back end', 'node', 'django', 'flask', 'fullstack', 'full-stack', 'full stack', 'python', 'java ', 'android', 'ios', 'mobile', 'flutter', 'react native', 'data science', 'machine learning', 'ml', 'ai', 'data analyst', 'data engineer'];
          matchesRole = !categories.some(cat => title.includes(cat));
        }
      }

      // Check experience matches
      let matchesExperience = true;
      if (selectedExperienceLevel !== 'All') {
        const isFresher = (j) => {
          if (!j.experience) return true;
          const exp = j.experience.toLowerCase();
          if (/(^|\s)[2-9]\s*(years?|yr)/.test(exp) || exp.includes('2 year') || exp.includes('3 year') || exp.includes('4 year') || exp.includes('5 year')) {
            return false;
          }
          return exp.includes('fresher') || exp.includes('0') || exp.includes('1 year') || exp.includes('no experience') || exp.includes('entry level') || exp.includes('0-2');
        };
        const isF = isFresher(job);
        if (selectedExperienceLevel === 'Fresher') {
          matchesExperience = isF;
        } else if (selectedExperienceLevel === 'Experienced') {
          matchesExperience = !isF;
        }
      }

      return matchesSearch && matchesCity && matchesRole && matchesExperience;
    });
  }, [jobs, searchQuery, activeCity, selectedRole, selectedExperienceLevel]);

  // Statistics
  const stats = useMemo(() => {
    const total = jobs.length;
    const preferred = jobs.filter((j) => j.is_preferred === 1).length;
    const remote = jobs.filter(
      (j) =>
        j.location.toLowerCase().includes('work from home') ||
        j.location.toLowerCase().includes('wfh') ||
        j.location.toLowerCase().includes('remote')
    ).length;
    const newToday = jobs.filter((j) => {
      const today = new Date().toISOString().split('T')[0];
      return j.date_fetched === today || j.date_posted === today;
    }).length;

    return { total, preferred, remote, newToday };
  }, [jobs]);

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Segment job description for drawer
  const parsedSections = useMemo(() => parseJobDescription(selectedJob?.description), [selectedJob]);
  const jobSections = useMemo(() => {
    return parsedSections.filter(s => !s.title.toLowerCase().includes('about company'));
  }, [parsedSections]);
  const companySection = useMemo(() => {
    return parsedSections.find(s => s.title.toLowerCase().includes('about company'));
  }, [parsedSections]);

  return (
    <>
      <div className="bg-glow-container">
        <div className="bg-glow-orb-1"></div>
        <div className="bg-glow-orb-2"></div>
      </div>

      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="app-title-section">
            <h1 className="app-title">NextGen Fresher Jobs</h1>
            <div className="app-subtitle">
              <span>IT & Computer Science Opportunities</span>
              <span className="india-badge">India Only</span>
              {selectedExperienceLevel === 'Fresher' && <span className="fresher-badge">Freshers Only</span>}
              {selectedExperienceLevel === 'Experienced' && <span className="priority-tag" style={{ fontSize: '0.75rem', padding: '1px 8px', textTransform: 'none' }}>Experienced Only</span>}
              {selectedExperienceLevel === 'All' && <span className="india-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', borderColor: 'rgba(255,255,255,0.1)' }}>All Experience Levels</span>}
            </div>
          </div>

          <div className="header-actions">
            <button className="sync-button" onClick={handleSyncClick} disabled={isSyncing}>
              <svg className={`sync-icon ${isSyncing ? 'spinning' : ''}`} viewBox="0 0 24 24">
                <path d="M19 8l-4 4h3c0 3.31-2.69 6-6 6-1.01 0-1.97-.25-2.8-.7l-1.46 1.46C8.97 19.54 10.43 20 12 20c4.42 0 8-3.58 8-8h3l-4-4zM6 12c0-3.31 2.69-6 6-6 1.01 0 1.97.25 2.8.7l1.46-1.46C15.03 4.46 13.57 4 12 4c-4.42 0-8 3.58-8 8H1l4 4 4-4H6z" />
              </svg>
              {isSyncing ? 'Syncing...' : 'Sync Status'}
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Opportunities</span>
            <span className="stat-value">{stats.total}</span>
            <span className="stat-decorator">ALL</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Priority Hubs</span>
            <span className="stat-value preferred-count">{stats.preferred}</span>
            <span className="stat-decorator">HUB</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Remote / WFH</span>
            <span className="stat-value">{stats.remote}</span>
            <span className="stat-decorator">WFH</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Synced Today</span>
            <span className="stat-value">{stats.newToday}</span>
            <span className="stat-decorator">NEW</span>
          </div>
        </section>

        {/* Search & Filter Panel */}
        <section className="search-filter-panel">
          <div className="search-row">
            <div className="search-input-wrapper">
              <svg className="search-icon" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <input
                type="text"
                placeholder="Search by role, company, skills, or location..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="dropdown-wrapper">
              <select
                className="filter-dropdown"
                value={selectedExperienceLevel}
                onChange={(e) => setSelectedExperienceLevel(e.target.value)}
              >
                <option value="Fresher">Freshers Jobs Only</option>
                <option value="Experienced">Experienced Jobs Only</option>
                <option value="All">All Jobs</option>
              </select>
            </div>

            <div className="dropdown-wrapper">
              <select
                className="filter-dropdown"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="All">All Roles</option>
                <option value="Software Developer">Software Developer</option>
                <option value="Frontend">Frontend Developer</option>
                <option value="Backend">Backend Developer</option>
                <option value="Full Stack">Full Stack Developer</option>
                <option value="Python">Python Developer</option>
                <option value="Java">Java Developer</option>
                <option value="Mobile">Mobile App Developer</option>
                <option value="Data Science & ML">Data Science & ML</option>
                <option value="Others">Other Roles</option>
              </select>
            </div>
          </div>

          <div className="filter-row">
            <span className="filter-label">Filter Location</span>
            <div className="filter-chips">
              {cities.map((city) => {
                const isPref = ['Bangalore', 'Hyderabad', 'Chennai'].includes(city);
                return (
                  <button
                    key={city}
                    className={`filter-chip ${isPref ? 'preferred-chip' : ''} ${
                      activeCity === city ? 'active' : ''
                    }`}
                    onClick={() => setActiveCity(city)}
                  >
                    {city} {isPref && '✦'}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Jobs List Section */}
        <main className="jobs-section">
          <div className="jobs-header">
            <h2 className="jobs-count">
              Showing <span>{filteredJobs.length}</span> {selectedExperienceLevel === 'Fresher' ? 'Fresher' : selectedExperienceLevel === 'Experienced' ? 'Experienced' : 'Total'} IT & CS Jobs
            </h2>
          </div>

          {filteredJobs.length > 0 ? (
            <div className="jobs-grid">
              {filteredJobs.map((job) => (
                <div
                  key={job.url}
                  className={`job-card ${job.is_preferred ? 'preferred' : ''}`}
                  onClick={() => setSelectedJob(job)}
                >
                  <div className="job-card-header">
                    {job.company_logo ? (
                      <img 
                        src={job.company_logo} 
                        alt={`${job.company} Logo`} 
                        className="company-logo-avatar"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="company-logo-placeholder">
                        {job.company.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="job-meta-titles">
                      <h3 className="job-card-title">{job.title}</h3>
                      <span className="job-card-company">{job.company}</span>
                    </div>
                    {job.is_preferred === 1 && <span className="priority-tag">Priority</span>}
                  </div>

                  <div className="job-card-details">
                    <div className="job-detail-row">
                      <svg className="job-detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      <span>{job.location}</span>
                    </div>
                    <div className="job-detail-row">
                      <svg className="job-detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5 0.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                      </svg>
                      <span>{job.salary}</span>
                    </div>
                    <div className="job-detail-row">
                      <svg className="job-detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                      </svg>
                      <span>{job.experience || 'Fresher / Entry Level'}</span>
                    </div>
                  </div>

                  <div className="job-card-footer">
                    <span className="posted-date">
                      Posted: {formatDate(job.date_posted || job.date_fetched)}
                    </span>
                    <span className="view-details-text">
                      Details
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-8.29-1.42 1.42L16.86 11H5v2z" />
                      </svg>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <svg className="empty-state-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <h3 className="empty-state-title">No matching jobs found</h3>
              <p>Try refining your search query or switching your filters.</p>
            </div>
          )}
        </main>
      </div>

      {/* Details Side Drawer */}
      {selectedJob && (
        <div className="drawer-backdrop" onClick={() => setSelectedJob(null)}>
          <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
            <header className="drawer-header">
              {selectedJob.company_logo ? (
                <img 
                  src={selectedJob.company_logo} 
                  alt={`${selectedJob.company} Logo`} 
                  className="drawer-company-logo"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="drawer-company-logo-placeholder">
                  {selectedJob.company.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="drawer-meta-title" style={{ flex: 1 }}>
                <span className="job-card-company">{selectedJob.company}</span>
                <h2 className="job-card-title" style={{ fontSize: '1.4rem', marginTop: '0.25rem' }}>
                  {selectedJob.title}
                </h2>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="india-badge">{selectedJob.location}</span>
                  <span className="fresher-badge">{selectedJob.salary}</span>
                  {selectedJob.is_preferred === 1 && <span className="priority-tag">Priority Location</span>}
                </div>
              </div>
              <button className="drawer-close-btn" onClick={() => setSelectedJob(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </header>

            <div className="drawer-body">
              {/* Job Overview Card */}
              <div>
                <h3 className="drawer-section-title">Job Overview</h3>
                <div className="jd-section-card" style={{ borderLeft: '4px solid var(--accent-purple)', padding: '1.25rem 1.5rem' }}>
                  <div className="job-card-details" style={{ border: 'none', padding: 0, gap: '0.75rem' }}>
                    <div className="job-detail-row">
                      <svg className="job-detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                      </svg>
                      <strong>Experience Required:</strong> {selectedJob.experience || 'Fresher / Entry Level'}
                    </div>
                    <div className="job-detail-row">
                      <svg className="job-detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5 0.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                      </svg>
                      <strong>Package (CTC):</strong> {selectedJob.salary}
                    </div>
                    <div className="job-detail-row">
                      <svg className="job-detail-icon" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z" />
                      </svg>
                      <strong>Date Posted:</strong> {formatDate(selectedJob.date_posted)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Organized Job Description Sections */}
              {jobSections.length > 0 && (
                <div>
                  <h3 className="drawer-section-title">About the Job & Requirements</h3>
                  {jobSections.map((section, idx) => {
                    const { className, icon } = getSectionClassAndIcon(section.title);
                    return (
                      <div key={idx} className={`jd-section-card ${className}`}>
                        <div className="jd-section-title-wrapper">
                          <span className="jd-section-icon">{icon}</span>
                          <h4 className="jd-section-card-title">{section.title}</h4>
                        </div>
                        <div 
                          className="jd-section-card-body" 
                          dangerouslySetInnerHTML={{ __html: section.html }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Organized Company Profile Card */}
              <div>
                <h3 className="drawer-section-title">Company Profile</h3>
                <div className="company-profile-card">
                  <div className="company-profile-header">
                    {selectedJob.company_logo ? (
                      <img 
                        src={selectedJob.company_logo} 
                        alt={`${selectedJob.company} Logo`} 
                        className="company-logo-avatar"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="company-logo-placeholder">
                        {selectedJob.company.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <h4 className="company-profile-title">{selectedJob.company}</h4>
                  </div>
                  <div 
                    className="company-profile-body"
                    dangerouslySetInnerHTML={{ 
                      __html: companySection 
                        ? companySection.html 
                        : `<p>We don't have detailed profile information for <strong>${selectedJob.company}</strong> yet, but you can learn more about them and apply directly using the link below.</p>` 
                    }}
                  />
                </div>
              </div>
            </div>

            <footer className="drawer-footer">
              <a
                href={selectedJob.url}
                target="_blank"
                rel="noopener noreferrer"
                className="apply-button"
              >
                Apply on Internshala
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                </svg>
              </a>
            </footer>
          </div>
        </div>
      )}

      {/* Sync Status / Instructions Modal */}
      {showSyncModal && (
        <div className="drawer-backdrop" onClick={() => setShowSyncModal(false)}>
          <div
            className="drawer-container"
            style={{
              width: '90%',
              maxWidth: '500px',
              height: 'auto',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              borderRadius: '20px',
              animation: 'fadeIn 0.2s ease forwards',
              right: 'auto',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="drawer-header" style={{ padding: '1.25rem 1.5rem' }}>
              <h2 className="job-card-title" style={{ fontSize: '1.25rem' }}>
                🔄 Job Sync Status & Guide
              </h2>
              <button className="drawer-close-btn" onClick={() => setShowSyncModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </header>

            <div className="drawer-body" style={{ padding: '1.5rem', gap: '1.25rem' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                <p style={{ marginBottom: '1rem' }}>
                  This dashboard operates <strong>completely serverless</strong>, loading job data from a committed JSON database.
                </p>
                
                <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                  ☁️ Cloud Automation (When Laptop is Off):
                </h4>
                <p style={{ marginBottom: '1rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--accent-cyan)' }}>
                  A <strong>GitHub Actions</strong> workflow is scheduled to run daily at <strong>12:00 PM IST</strong> in the cloud. It scrapes new listings, prunes older ones, and commits updates to your repo automatically.
                </p>

                <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
                  💻 Local Manual Trigger:
                </h4>
                <p style={{ marginBottom: '1rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--accent-purple)' }}>
                  To scrape new jobs right now from your machine, run the following in your terminal:
                  <code style={{
                    display: 'block',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    marginTop: '0.5rem',
                    fontFamily: 'monospace',
                    color: 'var(--accent-cyan)'
                  }}>
                    npm run scrape
                  </code>
                </p>
              </div>
            </div>

            <footer className="drawer-footer" style={{ padding: '1rem 1.5rem', justifyContent: 'flex-end' }}>
              <button
                className="apply-button"
                style={{ padding: '0.75rem 1.5rem', flex: 'none' }}
                onClick={() => setShowSyncModal(false)}
              >
                Got it
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
