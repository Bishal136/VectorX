// test-api.cjs - CommonJS version (no ES module issues)
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Color helpers for better output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function logSuccess(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function logError(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function logInfo(msg) {
  console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
}

function logWarning(msg) {
  console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
}

async function testRegister() {
  console.log('\n📝 Testing Registration...');
  const timestamp = Date.now();
  
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/register`, {
      name: `Test User ${timestamp}`,
      email: `user${timestamp}@example.com`,
      password: 'Password123!',
      phone: `+880${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      role: 'user'
    });
    logSuccess(`User registered: ${res.data.data.email}`);
    return { success: true, user: res.data.data, email: res.data.data.email };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    logError(`Registration failed: ${msg}`);
    return { success: false, error: msg };
  }
}

async function testLogin(email, password = 'Password123!') {
  console.log('\n🔐 Testing Login...');
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      email,
      password
    });
    logSuccess(`Login successful for ${email}`);
    return { 
      success: true, 
      accessToken: res.data.data.accessToken,
      refreshToken: res.data.data.refreshToken,
      user: res.data.data.user
    };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    logError(`Login failed: ${msg}`);
    return { success: false, error: msg };
  }
}

async function testProfile(accessToken) {
  console.log('\n👤 Testing Profile Access...');
  try {
    const res = await axios.get(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    logSuccess(`Profile retrieved: ${res.data.data.name} (${res.data.data.role})`);
    return { success: true, profile: res.data.data };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    logError(`Profile access failed: ${msg}`);
    return { success: false, error: msg };
  }
}

async function testCheckRole(accessToken) {
  console.log('\n🎯 Testing Role Check...');
  try {
    const res = await axios.get(`${BASE_URL}/api/auth/check-role`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    logSuccess(`Current role: ${res.data.data.role}`);
    return { success: true, role: res.data.data.role };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    logError(`Role check failed: ${msg}`);
    return { success: false, error: msg };
  }
}

async function testRefreshToken(refreshToken) {
  console.log('\n🔄 Testing Token Refresh...');
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/refresh`, {
      refreshToken
    });
    logSuccess('New access token received');
    return { success: true, newAccessToken: res.data.data.accessToken };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    logError(`Token refresh failed: ${msg}`);
    return { success: false, error: msg };
  }
}

async function testLogout(accessToken, refreshToken) {
  console.log('\n🚪 Testing Logout...');
  try {
    await axios.post(`${BASE_URL}/api/auth/logout`, 
      { refreshToken },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    logSuccess('Logout successful');
    return { success: true };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    logError(`Logout failed: ${msg}`);
    return { success: false, error: msg };
  }
}

async function testForgotPassword(email) {
  console.log('\n📧 Testing Forgot Password...');
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/forgot-password`, {
      email
    });
    logSuccess(`Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    logError(`Forgot password failed: ${msg}`);
    return { success: false, error: msg };
  }
}

async function testAdminLogin() {
  console.log('\n👑 Testing Admin Login...');
  try {
    const res = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@vectorx.com',
      password: 'admin123'
    });
    logSuccess(`Admin login successful`);
    return { 
      success: true, 
      accessToken: res.data.data.accessToken,
      refreshToken: res.data.data.refreshToken,
      user: res.data.data.user
    };
  } catch (error) {
    const msg = error.response?.data?.message || error.message;
    logError(`Admin login failed: ${msg}`);
    return { success: false, error: msg };
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.blue}🚀 VECTORX AUTH API TEST SUITE${colors.reset}`);
  console.log('='.repeat(60));
  
  // Check if server is running
  console.log('\n⏳ Checking server connection...');
  try {
    await axios.get(`${BASE_URL}/api/auth/check-role`, { timeout: 2000 });
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      logError('Server is not running!');
      console.log('\nPlease start your server first:');
      console.log('  cd /home/bishal/BishalHome/Cours/Ecommarce/vectorX/server');
      console.log('  npm run dev\n');
      return;
    }
  }
  logSuccess('Server is running');
  
  // 1. Register a user
  const registerResult = await testRegister();
  if (!registerResult.success) {
    logWarning('Registration failed, attempting to continue with manual login');
  }
  
  // 2. Test login with registered user or use a test account
  let loginResult;
  if (registerResult.success) {
    loginResult = await testLogin(registerResult.email);
  } else {
    logInfo('Using test@example.com for login (you may need to adjust)');
    loginResult = await testLogin('test@example.com');
  }
  
  if (!loginResult.success) {
    logWarning('Login failed - OTP verification might be required');
    logInfo('If you registered a new account, check your email for OTP');
    logInfo('Then verify with: POST /api/auth/verify-otp');
  }
  
  // 3. If we have access token, test protected routes
  if (loginResult.success && loginResult.accessToken) {
    await testProfile(loginResult.accessToken);
    await testCheckRole(loginResult.accessToken);
    await testRefreshToken(loginResult.refreshToken);
    await testLogout(loginResult.accessToken, loginResult.refreshToken);
  }
  
  // 4. Test forgot password
  if (registerResult.success) {
    await testForgotPassword(registerResult.email);
  }
  
  // 5. Test admin login
  await testAdminLogin();
  
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.green}✨ Test Suite Complete!${colors.reset}`);
  console.log('='.repeat(60) + '\n');
}

// Run the tests
runAllTests().catch(error => {
  console.error('Unhandled error:', error);
});