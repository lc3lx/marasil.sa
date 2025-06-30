class NotificationSystem {
    constructor() {
        this.socket = null;
        this.currentUserId = null;
        this.notifications = [];
        this.unreadCount = 0;
        
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // Get DOM elements
        this.userIdInput = document.getElementById('userId');
        this.connectBtn = document.getElementById('connectBtn');
        this.notificationBell = document.getElementById('notificationBell');
        this.notificationCount = document.getElementById('notificationCount');
        this.notificationPanel = document.getElementById('notificationPanel');
        this.closePanelBtn = document.getElementById('closePanelBtn');
        this.panelContent = document.getElementById('panelContent');
        this.notificationsList = document.getElementById('notificationsList');
        this.notificationToast = document.getElementById('notificationToast');
        this.toastMessage = document.getElementById('toastMessage');
        this.toastClose = document.getElementById('toastClose');
        
        // Demo controls
        this.notificationType = document.getElementById('notificationType');
        this.targetUserId = document.getElementById('targetUserId');
        this.notificationMessage = document.getElementById('notificationMessage');
        this.sendNotificationBtn = document.getElementById('sendNotificationBtn');
        this.simulateOrderBtn = document.getElementById('simulateOrderBtn');
    }

    bindEvents() {
        // Connection events
        this.connectBtn.addEventListener('click', () => this.connect());
        
        // Notification bell events
        this.notificationBell.addEventListener('click', () => this.togglePanel());
        this.closePanelBtn.addEventListener('click', () => this.closePanel());
        
        // Toast events
        this.toastClose.addEventListener('click', () => this.hideToast());
        
        // Demo events
        this.sendNotificationBtn.addEventListener('click', () => this.sendNotification());
        this.simulateOrderBtn.addEventListener('click', () => this.simulateOrder());
        
        // Auto-hide toast after 5 seconds
        setTimeout(() => this.hideToast(), 5000);
    }

    connect() {
        const userId = this.userIdInput.value.trim();
        if (!userId) {
            alert('Please enter a user ID');
            return;
        }

        this.currentUserId = userId;
        
        // Initialize Socket.IO connection
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateConnectionStatus(true);
            
            // Join user-specific room
            this.socket.emit('join_user_room', { userId: this.currentUserId });
            
            // Load existing notifications
            this.loadNotifications();
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateConnectionStatus(false);
        });

        this.socket.on('new_notification', (notification) => {
            console.log('New notification received:', notification);
            this.addNotification(notification);
            this.showToast(notification.message);
            this.animateBell();
        });

        this.socket.on('notification_read', (data) => {
            console.log('Notification read:', data);
            this.markNotificationAsRead(data.notificationId);
        });

        this.connectBtn.textContent = 'Connected';
        this.connectBtn.disabled = true;
    }

    updateConnectionStatus(connected) {
        const statusHtml = `
            <div class="connection-status">
                <span class="status-indicator ${connected ? 'connected' : 'disconnected'}"></span>
                ${connected ? 'Connected' : 'Disconnected'}
            </div>
        `;
        
        // Add status to header if not exists
        let statusElement = document.querySelector('.connection-status');
        if (!statusElement) {
            const userControls = document.querySelector('.user-controls');
            userControls.insertAdjacentHTML('beforeend', statusHtml);
        } else {
            statusElement.outerHTML = statusHtml;
        }
    }

    async loadNotifications() {
        try {
            const response = await fetch(`/api/notifications/${this.currentUserId}`);
            const notifications = await response.json();
            
            this.notifications = notifications;
            this.updateUnreadCount();
            this.renderNotifications();
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    async loadUnreadCount() {
        try {
            const response = await fetch(`/api/notifications/${this.currentUserId}/unread-count`);
            const data = await response.json();
            this.unreadCount = data.unreadCount;
            this.updateNotificationCount();
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    }

    addNotification(notification) {
        this.notifications.unshift(notification);
        if (!notification.readStatus) {
            this.unreadCount++;
        }
        this.updateNotificationCount();
        this.renderNotifications();
    }

    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.readStatus).length;
        this.updateNotificationCount();
    }

    updateNotificationCount() {
        this.notificationCount.textContent = this.unreadCount;
        if (this.unreadCount > 0) {
            this.notificationCount.classList.remove('hidden');
        } else {
            this.notificationCount.classList.add('hidden');
        }
    }

    renderNotifications() {
        const notificationsHtml = this.notifications.map(notification => 
            this.createNotificationHtml(notification)
        ).join('');
        
        this.notificationsList.innerHTML = notificationsHtml;
        this.panelContent.innerHTML = notificationsHtml;
        
        // Add click events to notification items
        document.querySelectorAll('.notification-item').forEach(item => {
            item.addEventListener('click', () => {
                const notificationId = item.dataset.notificationId;
                this.markAsRead(notificationId);
            });
        });
    }

    createNotificationHtml(notification) {
        const timeAgo = this.getTimeAgo(new Date(notification.timestamp));
        const unreadClass = notification.readStatus ? '' : 'unread';
        
        return `
            <div class="notification-item ${unreadClass}" data-notification-id="${notification._id}">
                <div class="notification-header">
                    <span class="notification-type ${notification.type}">${notification.type}</span>
                    <span class="notification-time">${timeAgo}</span>
                </div>
                <div class="notification-message">${notification.message}</div>
            </div>
        `;
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    async markAsRead(notificationId) {
        try {
            const response = await fetch(`/api/notifications/${notificationId}/read`, {
                method: 'PUT'
            });
            
            if (response.ok) {
                this.markNotificationAsRead(notificationId);
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    markNotificationAsRead(notificationId) {
        const notification = this.notifications.find(n => n._id === notificationId);
        if (notification && !notification.readStatus) {
            notification.readStatus = true;
            this.unreadCount--;
            this.updateNotificationCount();
            this.renderNotifications();
        }
    }

    togglePanel() {
        this.notificationPanel.classList.toggle('open');
    }

    closePanel() {
        this.notificationPanel.classList.remove('open');
    }

    showToast(message) {
        this.toastMessage.textContent = message;
        this.notificationToast.classList.add('show');
        
        // Auto-hide after 5 seconds
        setTimeout(() => this.hideToast(), 5000);
    }

    hideToast() {
        this.notificationToast.classList.remove('show');
    }

    animateBell() {
        this.notificationBell.classList.add('shake');
        setTimeout(() => {
            this.notificationBell.classList.remove('shake');
        }, 500);
    }

    async sendNotification() {
        const type = this.notificationType.value;
        const targetUserId = this.targetUserId.value.trim();
        const message = this.notificationMessage.value.trim();
        
        if (!message) {
            alert('Please enter a message');
            return;
        }

        const notificationData = {
            type,
            message,
            userId: type === 'targeted' ? targetUserId : null
        };

        try {
            const response = await fetch('/api/notifications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(notificationData)
            });

            if (response.ok) {
                this.notificationMessage.value = '';
                console.log('Notification sent successfully');
            }
        } catch (error) {
            console.error('Error sending notification:', error);
        }
    }

    async simulateOrder() {
        const orderData = {
            event: 'order.created',
            data: {
                id: Math.floor(Math.random() * 10000),
                customer: {
                    id: this.currentUserId
                },
                total: {
                    amount: (Math.random() * 500 + 50).toFixed(2),
                    currency: 'SAR'
                }
            }
        };

        try {
            const response = await fetch('/api/salla/webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(orderData)
            });

            if (response.ok) {
                console.log('Order webhook simulated successfully');
            }
        } catch (error) {
            console.error('Error simulating order webhook:', error);
        }
    }
}

// Initialize the notification system when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new NotificationSystem();
});

