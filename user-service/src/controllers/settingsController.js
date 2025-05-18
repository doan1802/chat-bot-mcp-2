const supabase = require('../config/supabase');

// Lấy thông tin cài đặt của người dùng
const getUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;

    // Lấy thông tin settings từ bảng settings
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    if (!data) {
      // Nếu không tìm thấy, tạo mới settings cho người dùng
      const { data: newSettings, error: createError } = await supabase
        .from('settings')
        .insert([
          { user_id: userId }
        ])
        .select()
        .single();

      if (createError) {
        return res.status(400).json({ error: createError.message });
      }

      return res.status(200).json({ settings: newSettings });
    }

    return res.status(200).json({ settings: data });
  } catch (error) {
    console.error('Get user settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Cập nhật thông tin cài đặt của người dùng
const updateUserSettings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { theme, language, gemini_api_key, vapi_api_key, raper_url } = req.body;

    // Cập nhật thông tin settings
    const updateData = {};
    
    if (theme !== undefined) updateData.theme = theme;
    if (language !== undefined) updateData.language = language;
    if (gemini_api_key !== undefined) updateData.gemini_api_key = gemini_api_key;
    if (vapi_api_key !== undefined) updateData.vapi_api_key = vapi_api_key;
    if (raper_url !== undefined) updateData.raper_url = raper_url;
    
    // Thêm trường updated_at
    updateData.updated_at = new Date();

    // Kiểm tra xem settings đã tồn tại chưa
    const { data: existingSettings, error: checkError } = await supabase
      .from('settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 là lỗi "không tìm thấy"
      return res.status(400).json({ error: checkError.message });
    }

    let result;
    
    if (!existingSettings) {
      // Nếu chưa có, tạo mới
      updateData.user_id = userId;
      const { data, error } = await supabase
        .from('settings')
        .insert([updateData])
        .select()
        .single();
        
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      result = data;
    } else {
      // Nếu đã có, cập nhật
      const { data, error } = await supabase
        .from('settings')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) {
        return res.status(400).json({ error: error.message });
      }
      
      result = data;
    }

    return res.status(200).json({
      message: 'Settings updated successfully',
      settings: result
    });
  } catch (error) {
    console.error('Update user settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getUserSettings,
  updateUserSettings
};
