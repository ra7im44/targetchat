module.exports = (sequelize, DataTypes) => {
  const UserSession = sequelize.define('UserSession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      field: 'user_id'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address'
    },
    deviceInfo: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'device_info'
    },
    deviceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'device_type'
    },
    browser: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'browser'
    },
    os: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'os'
    },
    country: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'country'
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'city'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    lastActivity: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'last_activity'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at'
    }
  }, {
    tableName: 'user_sessions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return UserSession;
};
