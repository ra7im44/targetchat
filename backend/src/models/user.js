module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    avatar: { type: DataTypes.STRING, allowNull: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.STRING(20),
      defaultValue: 'user',
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: true,
      field: 'is_active'
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'last_login'
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'reset_password_token'
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reset_password_expires'
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_verified'
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'verification_token'
    },
    lastIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'last_ip'
    },
    registrationIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'registration_ip'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  return User;
};
