import type { DocSearchProps } from 'typesense-docsearch-react';

export type Locales = Record<
  string,
  { translations: DocSearchProps['translations']; placeholder: string }
>;

export const ZH_LOCALES: Locales = {
  zh: {
    placeholder: '搜索文档',
    translations: {
      button: {
        buttonText: '搜索',
        buttonAriaLabel: '搜索',
      },
      modal: {
        searchBox: {
          resetButtonTitle: '清除查询条件',
          resetButtonAriaLabel: '清除查询条件',
          cancelButtonText: '取消',
          cancelButtonAriaLabel: '取消',
        },
        startScreen: {
          recentSearchesTitle: '搜索历史',
          noRecentSearchesText: '没有搜索历史',
          saveRecentSearchButtonTitle: '保存至搜索历史',
          removeRecentSearchButtonTitle: '从搜索历史中移除',
          favoriteSearchesTitle: '收藏',
          removeFavoriteSearchButtonTitle: '从收藏中移除',
        },
        errorScreen: {
          titleText: '无法获取结果',
          helpText: '你可能需要检查你的网络连接',
        },
        footer: {
          selectText: '选择',
          navigateText: '切换',
          closeText: '关闭',
          searchByText: '搜索提供者',
        },
        noResultsScreen: {
          noResultsText: '无法找到相关结果',
          suggestedQueryText: '你可以尝试查询',
          reportMissingResultsText: '你认为该查询应该有结果？',
          reportMissingResultsLinkText: '点击反馈',
        },
      },
    },
  },
} as const;

export const RU_LOCALES: Locales = {
  ru: {
    placeholder: 'Поиск в документации',
    translations: {
      button: {
        buttonText: 'Поиск',
        buttonAriaLabel: 'Поиск',
      },
      modal: {
        searchBox: {
          resetButtonTitle: 'Очистить поиск',
          resetButtonAriaLabel: 'Очистить поиск',
          cancelButtonText: 'Закрыть',
          cancelButtonAriaLabel: 'Закрыть',
        },
        startScreen: {
          recentSearchesTitle: 'История поиска',
          noRecentSearchesText: 'Нет истории поиска',
          saveRecentSearchButtonTitle: 'Сохранить в истории поиска',
          removeRecentSearchButtonTitle: 'Удалить из истории поиска',
          favoriteSearchesTitle: 'Избранное',
          removeFavoriteSearchButtonTitle: 'Удалить из избранного',
        },
        errorScreen: {
          titleText: 'Невозможно получить результаты',
          helpText: 'Проверьте подключение к Интернету',
        },
        footer: {
          selectText: 'выбрать',
          navigateText: 'перейти',
          closeText: 'закрыть',
          searchByText: 'поиск от',
        },
        noResultsScreen: {
          noResultsText: 'Ничего не найдено',
          suggestedQueryText: 'Попробуйте изменить запрос',
          reportMissingResultsText: 'Считаете, что результаты должны быть?',
          reportMissingResultsLinkText: 'Сообщите об этом',
        },
      },
    },
  },
} as const;

export const VN_LOCALES: Locales = {
  vn: {
    placeholder: 'Tìm kiếm tài liệu',
    translations: {
      button: {
        buttonText: 'Tìm kiếm',
        buttonAriaLabel: 'Tìm kiếm',
      },
      modal: {
        searchBox: {
          resetButtonTitle: 'Xóa truy vấn',
          resetButtonAriaLabel: 'Xóa truy vấn',
          cancelButtonText: 'Hủy',
          cancelButtonAriaLabel: 'Hủy',
        },
        startScreen: {
          recentSearchesTitle: 'Gần đây',
          noRecentSearchesText: 'Chưa có tìm kiếm gần đây',
          saveRecentSearchButtonTitle: 'Lưu tìm kiếm này',
          removeRecentSearchButtonTitle: 'Xóa tìm kiếm này khỏi lịch sử',
          favoriteSearchesTitle: 'Yêu thích',
          removeFavoriteSearchButtonTitle:
            'Xóa tìm kiếm này khỏi mục yêu thích',
        },
        errorScreen: {
          titleText: 'Không thể tải kết quả',
          helpText: 'Hãy kiểm tra lại kết nối mạng của bạn.',
        },
        footer: {
          selectText: 'để chọn',
          navigateText: 'để di chuyển',
          closeText: 'để đóng',
          searchByText: 'Vận hành bởi',
        },
        noResultsScreen: {
          noResultsText: 'Không có kết quả cho',
          suggestedQueryText: 'Hãy thử tìm với từ khóa',
          reportMissingResultsText: 'Bạn nghĩ truy vấn này nên có kết quả?',
          reportMissingResultsLinkText: 'Hãy cho chúng tôi biết.',
        },
      },
    },
  },
} as const;
