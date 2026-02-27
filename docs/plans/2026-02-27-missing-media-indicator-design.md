# 媒体文件丢失提示设计

**日期：** 2026-02-27
**文件：** `app/src/components/EntryCard.tsx`

## 问题

- 图片丢失时，点击占位符仍会打开 ImageViewer
- 音频丢失时，卡片无视觉提示，用户点击后才弹 Alert

## 方案：最小改动（方案 1）

### Section 1 — 图片丢失禁用点击

`photoError` 状态已存在，只需在两处加守卫：

```typescript
// handleImagePress
const handleImagePress = () => {
  if (photoError) return;
  setShowImageViewer(true);
};

// handleCardPress — photo 分支
case 'photo':
  if (photoError) return;
  setShowImageViewer(true);
  break;
```

### Section 2 — 音频丢失挂载检查 + 视觉提示

新增状态与 effect：

```typescript
const [audioMissing, setAudioMissing] = useState(false);

useEffect(() => {
  if (entry.type !== 'voice' || !(entry.media?.uri || entry.content)) return;
  const uri = entry.media?.uri || entry.content;
  FileSystem.getInfoAsync(uri)
    .then(info => { if (!info.exists) setAudioMissing(true); })
    .catch(() => {});
}, [entry.id]);
```

渲染层替换播放行：

```tsx
{audioMissing ? (
  <View style={styles.audioMissingRow}>
    <Ionicons name="alert-circle-outline" size={18} color="#A3A3A3" />
    <Text style={styles.audioMissingText}>音频文件已丢失</Text>
  </View>
) : (
  /* 原有播放行 */
)}
```

`handleCardPress` voice 分支加守卫：`if (audioMissing) return;`

新增样式：

```typescript
audioMissingRow: {
  flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8,
},
audioMissingText: { fontSize: 13, color: '#A3A3A3' },
```

## 改动范围

- 文件：`app/src/components/EntryCard.tsx`（仅此一个）
- 新增约 25 行，无新文件
