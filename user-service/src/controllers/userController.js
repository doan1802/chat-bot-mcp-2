const supabase = require('../config/supabase');

// Tạo profile cho người dùng
const createUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, avatar_url } = req.body;
    const workerId = process.pid;
    console.log(`[Worker ${workerId}] Creating profile for user: ${userId}`);

    // Kiểm tra xem profile đã tồn tại chưa
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .limit(1);

    if (checkError) {
      console.error(`[Worker ${workerId}] Error checking profile for user ${userId}:`, checkError);
      return res.status(400).json({ error: checkError.message });
    }

    if (existingProfile && existingProfile.length > 0) {
      console.log(`[Worker ${workerId}] Profile already exists for user: ${userId}`);
      return res.status(200).json({ profile: existingProfile[0] });
    }

    // Tạo profile mới
    const { data, error } = await supabase
      .from('profiles')
      .insert([
        {
          id: userId,
          email: req.user.email,
          full_name: full_name || req.user.email.split('@')[0],
          avatar_url: avatar_url || null,
          created_at: new Date(),
          updated_at: new Date()
        }
      ])
      .select();

    if (error) {
      console.error(`[Worker ${workerId}] Error creating profile for user ${userId}:`, error);
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      console.log(`[Worker ${workerId}] Failed to create profile for user: ${userId}`);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    const profile = data[0];

    // Lưu vào cache
    const userCache = req.app.locals.userCache;
    if (userCache) {
      console.log(`[Worker ${workerId}] Caching profile for user: ${userId}`);
      userCache.set(userId, profile);
    }

    // Tạo settings mặc định cho người dùng
    try {
      const { error: settingsError } = await supabase
        .from('settings')
        .insert([
          {
            user_id: userId,
            theme: 'dark',
            language: 'en',
            created_at: new Date(),
            updated_at: new Date()
          }
        ]);

      if (settingsError) {
        console.error(`[Worker ${workerId}] Error creating settings for user ${userId}:`, settingsError);
        // Không return lỗi vì profile đã được tạo thành công
      }
    } catch (settingsError) {
      console.error(`[Worker ${workerId}] Exception creating settings for user ${userId}:`, settingsError);
    }

    console.log(`[Worker ${workerId}] Successfully created profile for user: ${userId}`);
    return res.status(201).json({ profile });
  } catch (error) {
    console.error(`[Worker ${process.pid}] Create user profile error for user ${req.user.id}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Lấy thông tin người dùng
const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const workerId = process.pid;
    console.log(`[Worker ${workerId}] Getting profile for user: ${userId}`);

    // Kiểm tra cache
    const userCache = req.app.locals.userCache;
    if (userCache && userCache.has(userId)) {
      console.log(`[Worker ${workerId}] Cache hit for user profile: ${userId}`);
      return res.status(200).json({ profile: userCache.get(userId) });
    }

    console.log(`[Worker ${workerId}] Cache miss for user profile: ${userId}, fetching from database`);

    // Đảm bảo userId là chuỗi
    const userIdStr = String(userId);
    console.log(`[Worker ${workerId}] Querying profile with ID (as string): ${userIdStr}`);

    // Lấy thông tin profile từ bảng profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userIdStr)
      .limit(1);

    if (error) {
      console.error(`[Worker ${workerId}] Error getting profile for user ${userId}:`, error);
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      console.log(`[Worker ${workerId}] No profile found for user: ${userId}`);

      // Kiểm tra xem profile có tồn tại trong cache của worker khác không
      const allKeys = userCache.keys();
      console.log(`[Worker ${workerId}] Checking cache keys: ${allKeys.join(', ')}`);

      // Trả về lỗi 404 để API Gateway có thể xử lý
      return res.status(404).json({
        error: 'User profile not found',
        message: 'Profile not found in database. Please contact administrator.'
      });
    }

    const profile = data[0];

    // Lưu vào cache
    if (userCache) {
      console.log(`[Worker ${workerId}] Caching profile for user: ${userId}`);
      userCache.set(userId, profile);
    }

    console.log(`[Worker ${workerId}] Successfully retrieved profile for user: ${userId}`);
    return res.status(200).json({ profile });
  } catch (error) {
    console.error(`[Worker ${process.pid}] Get user profile error for user ${req.user.id}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Cập nhật thông tin người dùng
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, avatar_url } = req.body;
    const workerId = process.pid;
    console.log(`[Worker ${workerId}] Updating profile for user: ${userId}`);

    // Cập nhật thông tin profile
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: full_name,
        avatar_url: avatar_url,
        updated_at: new Date()
      })
      .eq('id', userId)
      .select();

    if (error) {
      console.error(`[Worker ${workerId}] Error updating profile for user ${userId}:`, error);
      return res.status(400).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      console.log(`[Worker ${workerId}] No profile found to update for user: ${userId}`);
      return res.status(404).json({ error: 'User profile not found' });
    }

    const profile = data[0];

    // Cập nhật cache
    const userCache = req.app.locals.userCache;
    if (userCache) {
      console.log(`[Worker ${workerId}] Updating cache for user: ${userId}`);
      userCache.set(userId, profile);
    }

    console.log(`[Worker ${workerId}] Successfully updated profile for user: ${userId}`);
    return res.status(200).json({
      message: 'Profile updated successfully',
      profile
    });
  } catch (error) {
    console.error(`[Worker ${process.pid}] Update user profile error for user ${req.user.id}:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  createUserProfile
};
