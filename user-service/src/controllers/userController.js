const supabase = require('../config/supabase');

// Lấy thông tin người dùng
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy thông tin profile từ bảng profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    return res.status(200).json({ profile: data });
  } catch (error) {
    console.error('Get user profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Cập nhật thông tin người dùng
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, avatar_url } = req.body;

    // Cập nhật thông tin profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: full_name,
        avatar_url: avatar_url,
        updated_at: new Date()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      message: 'Profile updated successfully',
      profile: data
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile
};
