// Server modules read their configuration from the environment on first use.
process.env.API_URL = "http://backend.test/api/v1";
process.env.DASHBOARD_URL = "https://admin.example.test";
process.env.BACKEND_PROXY_SECRET = "unit-test-proxy-secret";
