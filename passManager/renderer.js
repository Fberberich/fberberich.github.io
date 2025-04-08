const { ipcRenderer } = require('electron');
const CryptoJS = require('crypto-js');

// Show/hide tabs
function showTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    const activeButton = document.querySelector(`[href="${tabName}.html"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const activeTab = document.getElementById(`${tabName}-tab`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    // Load passwords when switching to view tab
    if (tabName === 'view') {
        loadPasswords();
    }
}

// Toggle password visibility in the form
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleButton = document.querySelector('.toggle-password');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleButton.textContent = 'Hide';
    } else {
        passwordInput.type = 'password';
        toggleButton.textContent = 'Show';
    }
}

// Handle form submission
document.getElementById('password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const service = document.getElementById('service').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Send data to main process
    ipcRenderer.send('save-password', { service, username, password });

    // Show success message
    const successMessage = document.getElementById('success-message');
    successMessage.style.display = 'block';
    setTimeout(() => {
        successMessage.style.display = 'none';
    }, 3000);

    // Clear form
    e.target.reset();
});

// Function to load passwords
function loadPasswords() {
    ipcRenderer.send('get-passwords');
}

// Search passwords
function searchPasswords() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    ipcRenderer.send('search-passwords', searchTerm);
}

// Function to copy password
function copyPassword(password) {
    navigator.clipboard.writeText(password).then(() => {
        alert('Password copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy password:', err);
    });
}

// Listen for password updates
ipcRenderer.on('passwords-updated', (event, passwords) => {
    const passwordList = document.getElementById('password-list');
    if (!passwordList) return; // Exit if we're not on the view page
    
    passwordList.innerHTML = '';

    if (!passwords || passwords.length === 0) {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) {
            emptyState.style.display = 'block';
        }
        return;
    }

    const emptyState = document.getElementById('empty-state');
    if (emptyState) {
        emptyState.style.display = 'none';
    }

    passwords.sort((a, b) => a.service.localeCompare(b.service));

    passwords.forEach(entry => {
        const passwordItem = document.createElement('div');
        passwordItem.className = 'password-item';
        
        // Create a safe version of the service name for IDs
        const safeServiceId = entry.service.replace(/[^a-zA-Z0-9]/g, '_');
        
        // Create buttons with event listeners
        const showButton = document.createElement('button');
        showButton.className = 'btn-copy';
        showButton.innerHTML = '<span class="button-icon">👁️</span>Show';
        showButton.addEventListener('click', (e) => {
            e.preventDefault();
            passwordView(safeServiceId, e, entry.password);
        });

        const copyButton = document.createElement('button');
        copyButton.className = 'btn-copy';
        copyButton.innerHTML = '<span class="button-icon">📋</span>Copy';
        copyButton.addEventListener('click', (e) => {
            e.preventDefault();
            copyPassword(entry.password);
        });

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn-delete';
        deleteButton.innerHTML = '<span class="button-icon">🗑️</span>Delete';
        deleteButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to delete this password?')) {
                ipcRenderer.send('delete-password', entry.service);
            }
        });
        
        passwordItem.innerHTML = `
            <div class="password-info">
                <h3>${entry.service}</h3>
                <p>${entry.username}</p>
                <div class="password-field">
                    <span class="password-display" id="pwd-${safeServiceId}">••••••••</span>
                </div>
            </div>
            <div class="password-actions">
            </div>
        `;
        
        // Add buttons to the actions div
        const actionsDiv = passwordItem.querySelector('.password-actions');
        actionsDiv.appendChild(showButton);
        actionsDiv.appendChild(copyButton);
        actionsDiv.appendChild(deleteButton);
        
        passwordList.appendChild(passwordItem);
    });
});

// Function to toggle password visibility in the list
function passwordView(serviceId, event, password) {
    const displayElement = document.getElementById(`pwd-${serviceId}`);
    const button = event.currentTarget;
    
    if (displayElement.textContent === '••••••••') {
        // Show password
        displayElement.textContent = password;
        button.innerHTML = '<span class="button-icon">👁️</span>Hide';
    } else {
        // Hide password
        displayElement.textContent = '••••••••';
        button.innerHTML = '<span class="button-icon">👁️</span>Show';
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Add event listener for the toggle button in the form
    const toggleButton = document.querySelector('.toggle-password');
    if (toggleButton) {
        toggleButton.addEventListener('click', togglePassword);
    }

    // Add event listeners for tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const href = button.getAttribute('href');
            if (href) {
                window.location.href = href;
            }
        });
    });

    // Add search input event listener
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', searchPasswords);
    }

    // Load passwords if we're on the view tab
    if (document.getElementById('view-tab')?.classList.contains('active')) {
        loadPasswords();
    }
}); 
