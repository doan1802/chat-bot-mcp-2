const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const verifyAdminToken = require('../middleware/verifyAdminToken');

// Lấy thông tin cài đặt của người dùng với quyền admin
router.get('/settings/:userId', verifyAdminToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const userEmail = req.headers['x-user-email'];
    
    console.log(`[ADMIN] Getting settings for user: ${userId} (${userEmail})`);

    // Lấy thông tin settings từ bảng settings với quyền admin
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (error) {
      console.error(`[ADMIN] Error getting settings for user ${userId}:`, error);
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      console.log(`[ADMIN] No settings found for user: ${userId}, creating new settings`);
      
      // Nếu không tìm thấy, tạo mới settings cho người dùng
      const { data: newSettings, error: createError } = await supabase
        .from('settings')
        .insert([
          { 
            user_id: userId,
            theme: 'dark',
            language: 'en',
            gemini_api_key: '',
            vapi_api_key: '',
            raper_url: '',
            created_at: new Date(),
            updated_at: new Date()
          }
        ])
        .select();

      if (createError) {
        console.error(`[ADMIN] Error creating settings for user ${userId}:`, createError);
        return res.status(400).json({ error: createError.message });
      }

      if (!newSettings || newSettings.length === 0) {
        console.error(`[ADMIN] Failed to create settings for user ${userId}`);
        return res.status(500).json({ error: 'Failed to create settings' });
      }

      console.log(`[ADMIN] Successfully created settings for user: ${userId}`);
      return res.status(200).json({ settings: newSettings[0] });
    }

    console.log(`[ADMIN] Successfully retrieved settings for user: ${userId}`);
    return res.status(200).json({ settings: data[0] });
  } catch (error) {
    console.error(`[ADMIN] Get user settings error for user ${req.params.userId}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Cập nhật thông tin cài đặt của người dùng với quyền admin
router.put('/settings/:userId', verifyAdminToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    const userEmail = req.headers['x-user-email'];
    const { theme, language, gemini_api_key, vapi_api_key, raper_url } = req.body;
    
    console.log(`[ADMIN] Updating settings for user: ${userId} (${userEmail})`);

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
      .limit(1);

    if (checkError) {
      console.error(`[ADMIN] Error checking settings for user ${userId}:`, checkError);
      return res.status(400).json({ error: checkError.message });
    }

    let result;

    if (!existingSettings || existingSettings.length === 0) {
      console.log(`[ADMIN] No settings found for user: ${userId}, creating new settings`);
      // Nếu chưa có, tạo mới
      updateData.user_id = userId;
      const { data, error } = await supabase
        .from('settings')
        .insert([updateData])
        .select();

      if (error) {
        console.error(`[ADMIN] Error creating settings for user ${userId}:`, error);
        return res.status(400).json({ error: error.message });
      }

      if (!data || data.length === 0) {
        console.error(`[ADMIN] Failed to create settings for user ${userId}`);
        return res.status(500).json({ error: 'Failed to create settings' });
      }

      console.log(`[ADMIN] Successfully created settings for user: ${userId}`);
      result = data[0];
    } else {
      console.log(`[ADMIN] Updating settings for user: ${userId}`);
      // Nếu đã có, cập nhật
      const { data, error } = await supabase
        .from('settings')
        .update(updateData)
        .eq('user_id', userId)
        .select();

      if (error) {
        console.error(`[ADMIN] Error updating settings for user ${userId}:`, error);
        return res.status(400).json({ error: error.message });
      }

      if (!data || data.length === 0) {
        console.error(`[ADMIN] Failed to update settings for user ${userId}`);
        return res.status(500).json({ error: 'Failed to update settings' });
      }

      console.log(`[ADMIN] Successfully updated settings for user: ${userId}`);
      result = data[0];
    }

    return res.status(200).json({
      message: 'Settings updated successfully',
      settings: result
    });
  } catch (error) {
    console.error(`[ADMIN] Update user settings error for user ${req.params.userId}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
