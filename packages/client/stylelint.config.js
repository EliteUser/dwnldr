import { propertyGroups } from 'stylelint-config-clean-order';

const propertiesOrder = propertyGroups.map((properties) => ({
  noEmptyLineBetween: true,
  /* Don't add empty lines between order groups */
  emptyLineBefore: 'never',
  properties,
}));

export default {
  extends: ['stylelint-config-recommended', 'stylelint-config-recommended-scss', 'stylelint-config-clean-order/error'],
  plugins: ['stylelint-use-logical', 'stylelint-scss'],
  rules: {
    'color-hex-length': 'long',
    'no-descending-specificity': null,
    'scss/at-mixin-argumentless-call-parentheses': 'always',
    'scss/at-mixin-parentheses-space-before': 'never',
    'csstools/use-logical': 'always',
    'rule-empty-line-before': [
      'always',
      {
        ignore: ['after-comment', 'first-nested'],
      },
    ],
    'order/properties-order': [
      propertiesOrder,
      {
        severity: 'error',
        unspecified: 'bottomAlphabetical',
      },
    ],
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['global', 'local'],
      },
    ],
  },
};
