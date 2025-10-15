const Announcement = require('../models/announcement');

// Get all announcements (for admin)
const getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'name email')
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
      .populate('createdBy', 'name email');
    
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
      createdBy: req.user.id
    });

    const savedAnnouncement = await announcement.save();
    await savedAnnouncement.populate('createdBy', 'name email');
    
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
    await updatedAnnouncement.populate('createdBy', 'name email');
    
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
