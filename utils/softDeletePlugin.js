import mongoose from 'mongoose';

export default function softDeletePlugin(schema) {
  schema.add({
    deleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  });

  schema.query.withDeleted = function () {
    this.setOptions({ withDeleted: true });
    return this;
  };

  function excludeDeleted() {
    if (!this.getOptions().withDeleted) {
      this.where({ deleted: false });
    }
  }

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('count', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);

  schema.statics.findActive = function (conditions = {}, projection, options = {}) {
    return this.find({ ...conditions, deleted: false }, projection, options);
  };

  schema.statics.softDeleteById = function (id, userId = null, session = null) {
    const update = { deleted: true, deletedAt: new Date(), deletedBy: userId };
    return this.findByIdAndUpdate(id, update, { new: true, session });
  };

  schema.statics.restoreById = function (id, session = null) {
    const update = { deleted: false, deletedAt: null, deletedBy: null };
    return this.findByIdAndUpdate(id, update, { new: true, session });
  };

  schema.methods.softDelete = function (userId = null, session = null) {
    this.deleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    return this.save({ session });
  };

  schema.methods.restore = function (session = null) {
    this.deleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save({ session });
  };
}
