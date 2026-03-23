import type { ComponentProps, ReactNode } from 'react';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { aboutPageStyles as styles } from './AboutPage.styles';
import {
  ABOUT_FEATURES,
  ABOUT_LINKS,
  ABOUT_PAGE_COPY,
  ABOUT_TECH_STACK,
  type AboutFeature,
  type AboutLinkItem,
  type AboutTechStackItem,
} from './aboutPageConfig';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface AboutPageContentProps {
  onOpenLink: (url: string) => void;
}

interface SectionProps {
  title: string;
  children: ReactNode;
}

interface FeatureItemProps {
  icon: IoniconName;
  text: string;
}

interface TechItemProps extends AboutTechStackItem {}

interface LinkItemProps extends AboutLinkItem {
  onOpenLink: (url: string) => void;
}

export function AboutPageContent({ onOpenLink }: AboutPageContentProps) {
  return (
    <>
      <AboutHeroSection />

      <Section title="功能特性">
        <View style={styles.featureList}>
          {ABOUT_FEATURES.map((feature) => (
            <FeatureItem
              key={feature.text}
              icon={feature.icon}
              text={feature.text}
            />
          ))}
        </View>
      </Section>

      <Section title="技术栈">
        <View style={styles.techStack}>
          {ABOUT_TECH_STACK.map((item) => (
            <TechItem key={item.name} {...item} />
          ))}
        </View>
      </Section>

      <Section title="开发者">
        <Text style={styles.developer}>{ABOUT_PAGE_COPY.developer}</Text>
      </Section>

      <Section title="更多信息">
        {ABOUT_LINKS.map((link) => (
          <LinkItem key={link.label} {...link} onOpenLink={onOpenLink} />
        ))}
      </Section>

      <AboutFooterSection />
    </>
  );
}

function AboutHeroSection() {
  return (
    <View style={styles.logoSection}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoEmoji}>📝</Text>
      </View>
      <Text style={styles.appName}>{ABOUT_PAGE_COPY.appName}</Text>
      <Text style={styles.version}>{ABOUT_PAGE_COPY.version}</Text>
      <Text style={styles.tagline}>{ABOUT_PAGE_COPY.tagline}</Text>
    </View>
  );
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function FeatureItem({ icon, text }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color="#6A89CC" />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function TechItem({ name, version }: TechItemProps) {
  return (
    <View style={styles.techItem}>
      <Text style={styles.techName}>{name}</Text>
      <Text style={styles.techVersion}>v{version}</Text>
    </View>
  );
}

function LinkItem({ icon, label, url, onOpenLink }: LinkItemProps) {
  return (
    <Pressable
      style={styles.linkButton}
      onPress={() => onOpenLink(url)}
    >
      <Ionicons name={icon} size={20} color="#6A89CC" />
      <Text style={styles.linkText}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color="#D1D1D1" />
    </Pressable>
  );
}

function AboutFooterSection() {
  return (
    <View style={styles.footer}>
      <Text style={styles.copyright}>{ABOUT_PAGE_COPY.copyrightYear}</Text>
      <Text style={styles.copyright}>{ABOUT_PAGE_COPY.copyrightText}</Text>
    </View>
  );
}
