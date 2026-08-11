/**
 * [INPUT]: 接收当前或旧版 style 持久化值中的内容显隐字段
 * [OUTPUT]: 对外提供共享显隐类型/默认值/迁移器，以及把多代旧 key 原子晋升到新 key 的字符串存储适配器
 * [POS]: state 模块的显隐迁移边界，把跨版式同语义开关收敛为单一布尔事实源；多代存储按新到旧
 *        逐项验证，损坏候选不会遮住更早但完好的配置，且旧版状态只作为一次性迁移输入
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

export interface SharedVisibilityState {
  showAvatar: boolean;
  showName: boolean;
  showDate: boolean;
  showTitle: boolean;
  showChapter: boolean;
  showAuthor: boolean;
  showBrand: boolean;
  showQr: boolean;
}

export const DEFAULT_SHARED_VISIBILITY: SharedVisibilityState = {
  showAvatar: true,
  showName: true,
  showDate: true,
  showTitle: true,
  showChapter: true,
  showAuthor: true,
  showBrand: true,
  showQr: true,
};

// v10 的显隐值按版式分别存储。迁移时只要任一版式曾隐藏，就统一隐藏，避免升级后泄露原本隐藏的信息。
function sharedFlag(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (!value || typeof value !== "object") return fallback;

  const flags = Object.values(value).filter((item): item is boolean => typeof item === "boolean");
  return flags.length > 0 ? flags.every(Boolean) : fallback;
}

export function migrateSharedVisibility(value: unknown): SharedVisibilityState {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};

  return {
    showAvatar: sharedFlag(source.showAvatar ?? source.showAvatarByLayout, DEFAULT_SHARED_VISIBILITY.showAvatar),
    showName: sharedFlag(source.showName ?? source.showNameByLayout, DEFAULT_SHARED_VISIBILITY.showName),
    showDate: sharedFlag(source.showDate ?? source.showDateByLayout, DEFAULT_SHARED_VISIBILITY.showDate),
    showTitle: sharedFlag(source.showTitle ?? source.showTitleByLayout, DEFAULT_SHARED_VISIBILITY.showTitle),
    showChapter: sharedFlag(source.showChapter ?? source.showChapterByLayout, DEFAULT_SHARED_VISIBILITY.showChapter),
    showAuthor: sharedFlag(source.showAuthor ?? source.showAuthorByLayout, DEFAULT_SHARED_VISIBILITY.showAuthor),
    showBrand: sharedFlag(source.showBrand ?? source.showBrandByLayout, DEFAULT_SHARED_VISIBILITY.showBrand),
    showQr: sharedFlag(source.showQr ?? source.showQrByLayout, DEFAULT_SHARED_VISIBILITY.showQr),
  };
}

interface StringStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isStyleRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// 当前 key 先验证为对象 JSON；无值或损坏时按新到旧顺序尝试旧 key。候选内容有效但持久化
// 失败时立即返回其迁移结果供本次会话使用，绝不降级覆盖为更旧状态；仅写入成功后清理旧值。
export function createMigratingStyleStringStorage(
  getStorage: () => StringStorageLike | undefined,
  currentKey: string,
  legacyKeys: readonly string[],
  migrate: (value: unknown) => unknown,
): StringStorageLike {
  return {
    getItem(key) {
      const storage = getStorage();
      if (!storage) return null;

      const current = storage.getItem(key);
      if (key !== currentKey) return current;

      if (current !== null) {
        try {
          if (isStyleRecord(JSON.parse(current))) return current;
        } catch {
          // 当前值语法损坏时继续尝试旧版本。
        }
      }

      for (const legacyKey of legacyKeys) {
        const legacy = storage.getItem(legacyKey);
        if (legacy === null) continue;

        let migrated: string;
        try {
          const parsed = JSON.parse(legacy);
          if (!isStyleRecord(parsed)) continue;
          migrated = JSON.stringify(migrate(parsed));
        } catch {
          // 单个候选语法损坏或迁移失败时继续尝试下一代。
          continue;
        }

        try {
          storage.setItem(currentKey, migrated);
        } catch {
          // 新状态已可供当前会话使用；保留全部旧 key，下一次启动再重试持久化。
          return migrated;
        }

        for (const keyToRemove of legacyKeys) {
          try {
            storage.removeItem(keyToRemove);
          } catch {
            // currentKey 已可靠写入，残留旧 key 不影响读取；reset 仍会再次尝试清理。
          }
        }
        return migrated;
      }

      return current;
    },
    setItem(key, value) {
      getStorage()?.setItem(key, value);
    },
    removeItem(key) {
      const storage = getStorage();
      if (!storage) return;

      if (key !== currentKey) {
        try {
          storage.removeItem(key);
        } catch {
          // 字符串存储接口没有错误通道；删除失败时保持原值，避免向 atom reset 抛异常。
        }
        return;
      }

      const writeDefaultBarrier = () => {
        try {
          storage.setItem(currentKey, JSON.stringify(migrate({})));
        } catch {
          // 存储完全不可写时只能保留现状；调用方当前会话仍会使用 atom 初始值。
        }
      };

      let legacyCleanupSucceeded = true;
      for (const legacyKey of legacyKeys) {
        try {
          storage.removeItem(legacyKey);
        } catch {
          legacyCleanupSucceeded = false;
        }
      }

      if (!legacyCleanupSucceeded) {
        // 旧 key 无法全清时以默认态覆盖 current，既完成重置，又阻止残留旧状态在重启后复活。
        writeDefaultBarrier();
        return;
      }

      try {
        storage.removeItem(currentKey);
      } catch {
        // current 无法删除时用默认态覆盖，避免重启后恢复重置前的配置。
        writeDefaultBarrier();
      }
    },
  };
}
