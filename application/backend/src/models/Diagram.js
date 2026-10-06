const mongoose = require('mongoose');

const DIAGRAM_TYPES = ['flowchart', 'sequence', 'class', 'er', 'state', 'gantt', 'mindmap'];

const diagramSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 120,
    },
    sourceText: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    diagramType: {
      type: String,
      required: true,
      enum: DIAGRAM_TYPES,
    },
    mermaidSyntax: {
      type: String,
      required: true,
      maxlength: 20000,
    },
    providerUsed: {
      type: String,
      enum: ['groq', 'claude'],
    },
    generationMs: {
      type: Number,
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    // Previous saved states, newest last, capped at MAX_VERSIONS by
    // diagramService. select:false keeps them out of list/detail payloads;
    // only the version-history endpoint asks for them explicitly.
    versions: {
      type: [
        {
          _id: false,
          title: String,
          mermaidSyntax: String,
          savedAt: Date,
        },
      ],
      select: false,
      default: [],
    },
    // Unguessable token for a read-only public link. Absent means "not
    // shared"; revoking a link deletes it, so an old URL stops working.
    shareToken: {
      type: String,
    },
  },
  { timestamps: true },
);

// Compound index, userId first: every real query filters by owner and
// sorts by recency, and Mongo can only use a compound index on a query
// that filters on a *prefix* of its fields — see docs/system-design.md §3.
diagramSchema.index({ userId: 1, createdAt: -1 });
// Sparse: most diagrams are never shared, and only shared ones need the
// index (and the uniqueness guarantee) at all.
diagramSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

diagramSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Diagram', diagramSchema);
module.exports.DIAGRAM_TYPES = DIAGRAM_TYPES;
module.exports.MAX_VERSIONS = 20;
module.exports.MAX_TAGS = 10;
module.exports.MAX_TAG_LENGTH = 30;
