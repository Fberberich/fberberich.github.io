const { ipcRenderer } = require('electron');

// Function to display passwords
function displayPasswords(passwords) {
    const passwordList = document.getElementById('password-list');
    const emptyState = document.getElementById('empty-state');
    
    if (passwords.length === 0) {
        passwordList.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    passwordList.innerHTML = '';

    passwords.sort((a, b) => a.service.localeCompare(b.service));

    passwords.forEach(entry => {
        const passwordItem = document.createElement('div');
        passwordItem.className = 'password-item';
        
        // Create a safe version of the service name for IDs (remove spaces and special characters)
        const safeServiceId = entry.service.replace(/[^a-zA-Z0-9]/g, '_');
        
        // Create buttons with event listeners instead of inline onclick
        const showButton = document.createElement('button');
        showButton.className = 'btn-copy';
        showButton.innerHTML = '<span class="button-icon">👁️</span>Show';
        showButton.addEventListener('click', (e) => passwordView(safeServiceId, e, entry.password));

        const copyButton = document.createElement('button');
        copyButton.className = 'btn-copy';
        copyButton.innerHTML = '<span class="button-icon">📋</span>Copy';
        copyButton.addEventListener('click', () => copyPassword(entry.password, copyButton));

        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn-delete';
        deleteButton.innerHTML = '<span class="button-icon">🗑️</span>Delete';
        deleteButton.addEventListener('click', () => deletePassword(entry.service));
        
        passwordItem.innerHTML = `
            <div class="password-info">
                <h3>${entry.service}</h3>
                <p>${entry.username}</p>
                <div class="password-field">
                    <span class="password-display" id="pwd-${safeServiceId}" data-password="${entry.password}">••••••••</span>
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
}

// Function to copy password
function copyPassword(password, button) {
    navigator.clipboard.writeText(password).then(() => {
        // Create success message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message success';
        messageDiv.innerHTML = `
            <span style="margin-right: 8px;">✅</span>
            Password copied to clipboard!
        `;
        
        // Remove any existing success messages
        const existingMessages = document.querySelectorAll('.message.success');
        existingMessages.forEach(msg => msg.remove());
        
        // Add the new message
        document.querySelector('.search-container').after(messageDiv);
        
        // Highlight the copy button briefly
        button.style.backgroundColor = '#4ade80';
        button.style.color = 'white';
        
        // Reset button style and remove message after 2 seconds
        setTimeout(() => {
            button.style.backgroundColor = '';
            button.style.color = '';
            messageDiv.remove();
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy password:', err);
        // Show error message
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message error';
        messageDiv.textContent = 'Failed to copy password to clipboard';
        document.querySelector('.search-container').after(messageDiv);
        setTimeout(() => messageDiv.remove(), 2000);
    });
}

// Function for password visibility - simplified W3Schools style
function passwordView(serviceId, event, password) {
    const displayElement = document.getElementById(`pwd-${serviceId}`);
    const button = event.target.closest('button');
    
    if (displayElement.textContent === '••••••••') {
        // Show password
        displayElement.textContent = displayElement.dataset.password;
        button.innerHTML = '<span class="button-icon">👁️</span>Hide';
    } else {
        // Hide password
        displayElement.textContent = '••••••••';
        button.innerHTML = '<span class="button-icon">👁️</span>Show';
    }
}

// Function to delete password
function deletePassword(service) {
    if (confirm('Are you sure you want to delete this password?')) {
        ipcRenderer.send('delete-password', service);
        // Request updated passwords after deletion
        ipcRenderer.send('get-passwords');
    }
}

// Search functionality
function searchPasswords() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    ipcRenderer.send('search-passwords', searchTerm);
}

// Listen for password updates
ipcRenderer.on('passwords-updated', (event, passwords) => {
    displayPasswords(passwords);
});

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Add search input event listener
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keyup', searchPasswords);
    }

    // Request initial passwords
    ipcRenderer.send('get-passwords');
}); 