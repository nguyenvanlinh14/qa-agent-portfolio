import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

export class CvPage extends BasePage {
  readonly path = '/cv.html';

  readonly cv: Locator;
  readonly summary: Locator;
  readonly profile: Locator;
  readonly experience: Locator;
  readonly roles: Locator;
  readonly engagements: Locator;
  readonly skills: Locator;
  readonly education: Locator;
  readonly certifications: Locator;
  readonly openSource: Locator;
  readonly contact: Locator;
  readonly printButton: Locator;
  /** mailto: / tel: links have no role-based locator; the href prefix is the only way to find them. */
  readonly emailOrPhoneLinks: Locator;

  constructor(page: Page) {
    super(page);
    this.cv = page.getByTestId('cv');
    this.summary = page.getByTestId('cv-summary');
    this.profile = page.getByTestId('cv-profile');
    this.experience = page.getByTestId('cv-experience');
    this.roles = page.getByTestId('cv-role');
    this.engagements = page.getByTestId('cv-engagement');
    this.skills = page.getByTestId('cv-skills');
    this.education = page.getByTestId('cv-education');
    this.certifications = page.getByTestId('cv-certifications');
    this.openSource = page.getByTestId('cv-oss');
    this.contact = page.getByTestId('cv-contact');
    this.printButton = page.getByRole('button', { name: 'Download PDF' });
    this.emailOrPhoneLinks = page.locator('a[href^="mailto:" i], a[href^="tel:" i]');
  }

  /** A link in the CV header by its accessible name (the LinkedIn / GitHub profile links). */
  profileLink(name: string | RegExp): Locator {
    return this.profile.getByRole('link', { name });
  }

  skill(name: string): Locator {
    return this.skills.getByRole('listitem').filter({ hasText: name });
  }
}
