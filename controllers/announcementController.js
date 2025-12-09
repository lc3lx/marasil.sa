const Announcement = require('../models/announcement');
const Customer = require('../models/customerModel');
const sendmail = require('../utils/SendMail');

// Get all announcements (for admin)
const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'firstName lastName email')
      .sort({ priority: -1, createdAt: -1 });
    
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ message: 'خطأ في جلب الإعلانات', error: error.message });
  }
};

// Get active announcements (for public display)
const getActiveAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      isActive: true,
      startDate: { $lte: now },
      $or: [
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    }).sort({ priority: -1, createdAt: -1 });
    
    res.json(announcements);
  } catch (error) {
    console.error('Error fetching active announcements:', error);
    res.status(500).json({ message: 'خطأ في جلب الإعلانات النشطة', error: error.message });
  }
};

// Get single announcement
const getAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email');
    
    if (!announcement) {
      return res.status(404).json({ message: 'الإعلان غير موجود' });
    }
    
    res.json(announcement);
  } catch (error) {
    console.error('Error fetching announcement:', error);
    res.status(500).json({ message: 'خطأ في جلب الإعلان', error: error.message });
  }
};

// Create new announcement
const createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      backgroundColor,
      textColor,
      fontSize,
      isActive,
      priority,
      startDate,
      endDate
    } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({ message: 'العنوان والمحتوى مطلوبان' });
    }

    const creatorId = (req.customer && req.customer._id) || (req.user && (req.user._id || req.user.id));
    const announcement = new Announcement({
      title,
      content,
      backgroundColor,
      textColor,
      fontSize,
      isActive,
      priority,
      startDate,
      endDate,
      createdBy: creatorId
    });

    const savedAnnouncement = await announcement.save();
    await savedAnnouncement.populate('createdBy', 'firstName lastName email');
    
    res.status(201).json(savedAnnouncement);
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ message: 'خطأ في إنشاء الإعلان', error: error.message });
  }
};

// Update announcement
const updateAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      backgroundColor,
      textColor,
      fontSize,
      isActive,
      priority,
      startDate,
      endDate
    } = req.body;

    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ message: 'الإعلان غير موجود' });
    }

    // Update fields
    if (title !== undefined) announcement.title = title;
    if (content !== undefined) announcement.content = content;
    if (backgroundColor !== undefined) announcement.backgroundColor = backgroundColor;
    if (textColor !== undefined) announcement.textColor = textColor;
    if (fontSize !== undefined) announcement.fontSize = fontSize;
    if (isActive !== undefined) announcement.isActive = isActive;
    if (priority !== undefined) announcement.priority = priority;
    if (startDate !== undefined) announcement.startDate = startDate;
    if (endDate !== undefined) announcement.endDate = endDate;

    const updatedAnnouncement = await announcement.save();
    await updatedAnnouncement.populate('createdBy', 'firstName lastName email');
    
    res.json(updatedAnnouncement);
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ message: 'خطأ في تحديث الإعلان', error: error.message });
  }
};

// Delete announcement
const deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ message: 'الإعلان غير موجود' });
    }

    await Announcement.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'تم حذف الإعلان بنجاح' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ message: 'خطأ في حذف الإعلان', error: error.message });
  }
};

// Toggle announcement status
const toggleAnnouncementStatus = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({ message: 'الإعلان غير موجود' });
    }

    announcement.isActive = !announcement.isActive;
    const updatedAnnouncement = await announcement.save();
    await updatedAnnouncement.populate('createdBy', 'name email');
    
    res.json(updatedAnnouncement);
  } catch (error) {
    console.error('Error toggling announcement status:', error);
    res.status(500).json({ message: 'خطأ في تغيير حالة الإعلان', error: error.message });
  }
};

module.exports = {
  getAllAnnouncements,
  getActiveAnnouncements,
  getAnnouncement,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementStatus
};

// Send announcement by email to recipients
// POST /api/announcements/:id/send
module.exports.sendAnnouncementEmails = async (req, res) => {
  try {
    const { id } = req.params;
    const { all = false, recipientIds = [], recipients = [] } = req.body || {};
    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ message: 'الإعلان غير موجود' });
    }

    // Collect emails
    let emails = [];
    if (Array.isArray(recipients)) {
      emails.push(...recipients.filter((e) => typeof e === 'string' && e.includes('@')));
    }
    if (Array.isArray(recipientIds) && recipientIds.length) {
      const users = await Customer.find({ _id: { $in: recipientIds } }).select('email');
      emails.push(...users.map((u) => u.email).filter(Boolean));
    }
    if (all) {
      const users = await Customer.find({ role: { $ne: 'admin' }, email: { $ne: null } }).select('email');
      emails.push(...users.map((u) => u.email).filter(Boolean));
    }
    // Deduplicate
    emails = Array.from(new Set(emails));

    if (!emails.length) {
      return res.status(400).json({ message: 'لا يوجد مستلمون صالحون' });
    }

    const subject = announcement.title || 'إشعار';
    const stripHtml = (html) => String(html || '').replace(/<[^>]+>/g, ' ');
    const text = stripHtml(announcement.content);

    let sent = 0;
    for (const to of emails) {
      try {
        await sendmail({ to, subject, text });
        sent += 1;
      } catch (e) {
        // continue
      }
    }

    res.json({ success: true, recipients: emails.length, sent });
  } catch (error) {
    console.error('Error sending announcement emails:', error);
    res.status(500).json({ message: 'خطأ في إرسال البريد', error: error.message });
  }
};
