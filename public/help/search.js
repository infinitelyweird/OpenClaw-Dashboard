// Simple search functionality for the OpenClaw Dashboard Help Section

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('help-search-input');
  const searchResults = document.getElementById('help-search-results');
	try {
		var obj = document.querySelector('input');
		
		if (!obj)
		{
			console.error('Could not find search box. Exiting search box logic.');
			return;
		}
		
	  searchInput.addEventListener('input', async () => {
		const query = searchInput.value.trim().toLowerCase();
		if (!query) {
		  searchResults.innerHTML = '';
		  return;
		}

		// Fake search index (replace with server-side or dynamic indexing solution)
		const searchIndex = [
		  { title: 'API Documentation', url: '/help/api-docs', content: 'Detailed list of API endpoints, parameters, and examples.' },
		  { title: 'Features Overview', url: '/help/features', content: 'Learn about the key features: drag-and-drop editing, widget customization, etc.' },
		  { title: 'Use Cases', url: '/help/use-cases', content: 'Real-world scenarios where the OpenClaw Dashboard enhances workflows.' },
		  { title: 'Swagger Interactive API', url: '/swagger-ui/index.html', content: 'Test APIs live using Swagger interactive documentation.' }
		];

		const results = searchIndex.filter(item =>
		  item.title.toLowerCase().includes(query) ||
		  item.content.toLowerCase().includes(query)
		);

		if (results.length) {
		  searchResults.innerHTML = results.map(result => `<li><a href="${result.url}">${result.title}</a>: ${result.content}</li>`).join('');
		} else {
		  searchResults.innerHTML = '<li>No results found.</li>';
		}
	  });
	} 
	catch(e)
	{
		console.error('unable to proceed: ' ,e);
	}
});