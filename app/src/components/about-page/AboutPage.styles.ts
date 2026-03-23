import { StyleSheet } from 'react-native';

export const aboutPageStyles = StyleSheet.create({
  logoSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 50,
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 48,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    fontWeight: '500',
    color: '#A3A3A3',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#737373',
    textAlign: 'center',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 16,
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 18,
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: '#4A4A4A',
  },
  techStack: {
    gap: 8,
  },
  techItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  techName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  techVersion: {
    fontSize: 14,
    color: '#737373',
  },
  developer: {
    fontSize: 14,
    color: '#737373',
    lineHeight: 22,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 12,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#4A4A4A',
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  copyright: {
    fontSize: 12,
    color: '#A3A3A3',
    marginBottom: 4,
  },
});
