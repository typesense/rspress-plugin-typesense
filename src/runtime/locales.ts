import type { DocSearchProps } from 'typesense-docsearch-react';

/**
 * Recursively removes `?` and `undefined` from all nested properties
 */
type DeepRequired<T> = T extends (...args: any[]) => any
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepRequired<NonNullable<U>>[]
    : T extends object
      ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
      : NonNullable<T>;

export type RequiredTranslations = DeepRequired<
  NonNullable<DocSearchProps['translations']>
>;

export type StrictLocaleConfig = {
  placeholder: string;
  translations: RequiredTranslations;
};

export type LocaleConfig = {
  placeholder: string;
  translations?: DocSearchProps['translations'];
};

export type StrictLocales = Record<string, StrictLocaleConfig>;
export type Locales = Record<string, LocaleConfig>;

export const ZH_LOCALES: StrictLocales = {
  zh: {
    placeholder: '搜索文档',
    translations: {
      button: {
        buttonText: '搜索',
        buttonAriaLabel: '搜索',
      },
      modal: {
        searchBox: {
          clearButtonTitle: '清除查询条件',
          clearButtonAriaLabel: '清除查询条件',
          closeButtonText: '取消',
          closeButtonAriaLabel: '取消',
          placeholderText: '搜索文档',
          enterKeyHint: 'search',
          searchInputLabel: '搜索',
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
          submitQuestionText: '提交问题',
          selectKeyAriaLabel: '回车键',
          navigateText: '切换',
          navigateUpKeyAriaLabel: '向上箭头',
          navigateDownKeyAriaLabel: '向下箭头',
          closeText: '关闭',
          backToSearchText: '返回搜索',
          closeKeyAriaLabel: 'Esc 键',
          poweredByText: '由…提供支持',
          searchByText: '搜索提供者',
        },
        noResultsScreen: {
          noResultsText: '无法找到相关结果',
          suggestedQueryText: '你可以尝试查询',
          reportMissingResultsText: '你认为该查询应该有结果？',
          reportMissingResultsLinkText: '点击反馈',
        },
        facets: {
          defaultValueLabel: '全部',
          facetMenuTriggerAriaLabel: '筛选菜单',
          clearAllLabel: '清除全部',
          facetsAriaLabel: '筛选条件',
          selectedFacetsAriaLabel: '已选筛选条件',
          clearFacetAriaLabel: '清除筛选',
        },
        resultsScreen: {
          askAiPlaceholder: '询问 AI：',
          noResultsAskAiPlaceholder: '文档里没找到？让 AI 帮忙：',
          resultsSectionTitle: '搜索结果',
          askAiResultsTitle: 'AI 回答',
          resultBadgeLabelText: '分类',
          recentConversationTimestampFallback: '刚刚',
        },
      },
    },
  },
} as const;

export const RU_LOCALES: StrictLocales = {
  ru: {
    placeholder: 'Поиск в документации',
    translations: {
      button: {
        buttonText: 'Поиск',
        buttonAriaLabel: 'Поиск',
      },
      modal: {
        searchBox: {
          clearButtonTitle: 'Очистить поиск',
          clearButtonAriaLabel: 'Очистить поиск',
          closeButtonText: 'Закрыть',
          closeButtonAriaLabel: 'Закрыть',
          placeholderText: 'Поиск в документации',
          enterKeyHint: 'search',
          searchInputLabel: 'Поиск',
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
          submitQuestionText: 'Задать вопрос',
          selectKeyAriaLabel: 'Клавиша Enter',
          navigateText: 'перейти',
          navigateUpKeyAriaLabel: 'Стрелка вверх',
          navigateDownKeyAriaLabel: 'Стрелка вниз',
          closeText: 'закрыть',
          backToSearchText: 'Назад к поиску',
          closeKeyAriaLabel: 'Клавиша Escape',
          poweredByText: 'При поддержке',
          searchByText: 'поиск от',
        },
        noResultsScreen: {
          noResultsText: 'Ничего не найдено',
          suggestedQueryText: 'Попробуйте изменить запрос',
          reportMissingResultsText: 'Считаете, что результаты должны быть?',
          reportMissingResultsLinkText: 'Сообщите об этом',
        },
        facets: {
          defaultValueLabel: 'Все',
          facetMenuTriggerAriaLabel: 'Меню фильтров',
          clearAllLabel: 'Очистить все',
          facetsAriaLabel: 'Фильтры',
          selectedFacetsAriaLabel: 'Выбранные фильтры',
          clearFacetAriaLabel: 'Удалить фильтр',
        },
        resultsScreen: {
          askAiPlaceholder: 'Спросить AI: ',
          noResultsAskAiPlaceholder: 'Не нашли в документации? Спросите AI: ',
          resultsSectionTitle: 'Результаты',
          askAiResultsTitle: 'Ответ AI',
          resultBadgeLabelText: 'Категория',
          recentConversationTimestampFallback: 'Недавно',
        },
      },
    },
  },
} as const;

export const VI_LOCALES: StrictLocales = {
  vi: {
    placeholder: 'Tìm kiếm tài liệu',
    translations: {
      button: {
        buttonText: 'Tìm kiếm',
        buttonAriaLabel: 'Tìm kiếm',
      },
      modal: {
        searchBox: {
          clearButtonTitle: 'Xóa truy vấn',
          clearButtonAriaLabel: 'Xóa truy vấn',
          closeButtonText: 'Hủy',
          closeButtonAriaLabel: 'Hủy',
          placeholderText: 'Tìm kiếm tài liệu',
          enterKeyHint: 'search',
          searchInputLabel: 'Tìm kiếm',
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
          submitQuestionText: 'Gửi câu hỏi',
          selectKeyAriaLabel: 'Phím Enter',
          navigateText: 'để di chuyển',
          navigateUpKeyAriaLabel: 'Mũi tên lên',
          navigateDownKeyAriaLabel: 'Mũi tên xuống',
          closeText: 'để đóng',
          backToSearchText: 'Quay lại tìm kiếm',
          closeKeyAriaLabel: 'Phím Escape',
          poweredByText: 'Vận hành bởi',
          searchByText: 'Vận hành bởi',
        },
        noResultsScreen: {
          noResultsText: 'Không có kết quả cho',
          suggestedQueryText: 'Hãy thử tìm với từ khóa',
          reportMissingResultsText: 'Bạn nghĩ truy vấn này nên có kết quả?',
          reportMissingResultsLinkText: 'Hãy cho chúng tôi biết.',
        },
        facets: {
          defaultValueLabel: 'Tất cả',
          facetMenuTriggerAriaLabel: 'Menu bộ lọc',
          clearAllLabel: 'Xóa tất cả',
          facetsAriaLabel: 'Bộ lọc',
          selectedFacetsAriaLabel: 'Các bộ lọc đã chọn',
          clearFacetAriaLabel: 'Xóa bộ lọc',
        },
        resultsScreen: {
          askAiPlaceholder: 'Hỏi AI: ',
          noResultsAskAiPlaceholder: 'Không tìm thấy trong tài liệu? Hỏi AI: ',
          resultsSectionTitle: 'Kết quả tìm kiếm',
          askAiResultsTitle: 'Câu trả lời từ AI',
          resultBadgeLabelText: 'Danh mục',
          recentConversationTimestampFallback: 'Vừa xong',
        },
      },
    },
  },
} as const;
