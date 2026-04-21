"use client";

import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[2rem] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] ring-1 ring-black/5 transition-shadow duration-300 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-8",
  {
    variants: {
      gradient: {
        orange: "bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50",
        gray: "bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50",
        purple: "bg-gradient-to-br from-violet-100 via-fuchsia-50 to-indigo-50",
        green: "bg-gradient-to-br from-emerald-100 via-teal-50 to-lime-50",
      },
    },
    defaultVariants: {
      gradient: "gray",
    },
  }
);

export interface GradientCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  badgeText: string;
  badgeColor: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
}

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  (
    {
      className,
      gradient,
      badgeText,
      badgeColor,
      title,
      description,
      ctaText,
      ctaHref,
      imageUrl,
      ...props
    },
    ref
  ) => {
    const cardAnimation = {
      rest: { scale: 1, y: 0 },
      hover: { scale: 1.015, y: -4 },
    };

    const imageAnimation = {
      rest: { scale: 1, rotate: 0 },
      hover: { scale: 1.06, rotate: 2 },
    };

    return (
      <motion.div
        ref={ref}
        variants={cardAnimation}
        initial="rest"
        whileHover="hover"
        animate="rest"
        className="h-full"
      >
        <div className={cn(cardVariants({ gradient }), className)} {...props}>
          <motion.img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            variants={imageAnimation}
            transition={{ type: "spring", stiffness: 320, damping: 18 }}
            className="pointer-events-none absolute -bottom-10 -right-10 w-[58%] max-w-[280px] rounded-[1.75rem] object-cover opacity-35 mix-blend-multiply saturate-75 sm:-bottom-12 sm:-right-12 sm:w-[54%]"
          />

          <div className="relative z-10 flex h-full flex-col">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-sm font-medium text-foreground/80 backdrop-blur-sm">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: badgeColor }}
              />
              {badgeText}
            </div>

            <div className="flex-1">
              <h3 className="max-w-[16ch] text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {title}
              </h3>
              <p className="mt-3 max-w-[28ch] text-sm leading-6 text-foreground/70 sm:text-base">
                {description}
              </p>
            </div>

            <Link
              href={ctaHref}
              className="group mt-8 inline-flex items-center gap-2 text-sm font-semibold text-foreground"
            >
              {ctaText}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }
);

GradientCard.displayName = "GradientCard";

export { GradientCard, cardVariants };
