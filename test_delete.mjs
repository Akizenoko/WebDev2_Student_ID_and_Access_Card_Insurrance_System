// Test delete endpoint
const loginRes = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'student@wmsu.edu.ph', password: 'password123' })
});
const loginData = await loginRes.json();
console.log('Login status:', loginRes.status, 'token:', loginData.token ? 'OK' : 'MISSING');
console.log('Login body:', JSON.stringify(loginData));

if (!loginData.token) process.exit(1);

// Try to delete app id=1 (released)
const delRes = await fetch('http://localhost:5000/api/applications/1', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${loginData.token}` }
});
const delData = await delRes.json().catch(e => ({ parseError: e.message }));
console.log('DELETE status:', delRes.status);
console.log('DELETE response:', JSON.stringify(delData));
