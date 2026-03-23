import { StyleSheet } from 'react-native';

export const helpPageStyles = StyleSheet.create({
  contactButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 14,
  },
  contactButtonText: {
    color: '#6A89CC',
    fontSize: 15,
    fontWeight: '500',
  },
  contactCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
  },
  contactText: {
    color: '#737373',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  faqA: {
    color: '#737373',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  faqHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  faqItem: {
    borderBottomColor: '#EBEBEB',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  faqList: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    overflow: 'hidden',
  },
  faqQ: {
    color: '#4A4A4A',
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    marginRight: 8,
  },
  sectionTitle: {
    color: '#A3A3A3',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 24,
    textTransform: 'uppercase',
  },
});
