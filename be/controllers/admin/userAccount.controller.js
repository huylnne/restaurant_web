const userAccountService = require('../../services/admin/userAccount.service');

class UserAccountController {
  async listUsers(req, res) {
    try {
      const { page = 1, limit = 10, search = '', role = 'user', accountStatus = 'all' } = req.query;
      const result = await userAccountService.listUsers({
        page,
        limit,
        search,
        role,
        accountStatus,
      });
      res.json(result);
    } catch (error) {
      console.error('listUsers:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async getSummary(req, res) {
    try {
      const stats = await userAccountService.getSummaryStats();
      res.json(stats);
    } catch (error) {
      console.error('getSummary:', error);
      res.status(500).json({ message: error.message });
    }
  }

  async getUserById(req, res) {
    try {
      const detail = await userAccountService.getUserDetail(req.params.id);
      res.json(detail);
    } catch (error) {
      console.error('getUserById:', error);
      res.status(error.message.includes('Không tìm thấy') ? 404 : 500).json({
        message: error.message,
      });
    }
  }

  async updateAccountStatus(req, res) {
    try {
      const { is_active, locked } = req.body;
      const user = await userAccountService.updateAccountStatus(
        req.params.id,
        req.userId,
        { is_active, locked }
      );

      const parts = [];
      if (typeof is_active === 'boolean') parts.push(`is_active=${is_active}`);
      if (typeof locked === 'boolean') parts.push(`locked=${locked}`);

      req.audit = {
        entityId: user.user_id,
        description: `Cập nhật tài khoản #${user.user_id} (${user.username}): ${parts.join(', ')}`,
        metadata: { is_active: user.is_active, locked: user.locked },
      };

      res.json({
        message: 'Cập nhật trạng thái tài khoản thành công',
        user: {
          user_id: user.user_id,
          username: user.username,
          is_active: user.is_active,
          locked: user.locked,
        },
      });
    } catch (error) {
      console.error('updateAccountStatus:', error);
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new UserAccountController();
