import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGear, faPause, faPlug } from '@awesome.me/kit-370a1eb793/icons/classic/solid';
import type { Connector } from '../../types/charger';
import { faJ1772, faCcs1, faNacs } from '@awesome.me/kit-370a1eb793/icons/kit/custom';

interface ConnectorIconProps {
  connector: Connector;
  className?: string;
}

export const ConnectorIcon = ({ connector, className = '' }: ConnectorIconProps) => {
  const svgProps = {
    className,
    width: 48,
    height: 48,
    viewBox: '0 0 48 48',
    fill: 'currentColor',
    xmlns: 'http://www.w3.org/2000/svg',
  };

  switch (connector.status) {
    case 'Preparing':
    case 'Finishing':
      return <FontAwesomeIcon icon={faGear} className="text-8xl" spin />;
    case 'Charging':
      return (
        <svg
          {...svgProps}
          width="100%"
          height="100%"
          viewBox="0 0 300 300"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
        >
          <style>
            {`
            @keyframes color-cycle {
              0%, 100% { fill: rgb(0, 157, 241); opacity: 0.9; } /* Blue 1 */
              25% { fill: rgb(5, 228, 98); opacity: 0.7; }     /* Green 1 */
              50% { fill: rgb(0, 122, 204); opacity: 0.9; }    /* Blue 2 */
              75% { fill: rgb(0, 180, 85); opacity: 0.7; }     /* Green 2 */
            }

            .charge-path {
              animation: color-cycle 8s ease-in-out infinite;
            }

            /* Outer paths */
            .charge-path-1 {
              animation-delay: 0s;
              animation-duration: 6s;
            }

            .charge-path-2 {
              animation-delay: -2s;
              animation-duration: 6s;
            }

            /* Inner paths */
            .charge-path-3 {
              animation-delay: -1s;
              animation-duration: 4s;
            }

            .charge-path-4 {
              animation-delay: -3s;
              animation-duration: 4s;
            }
          `}
          </style>
          <g transform="matrix(1.57405,0,0,1.57405,-93.3438,-171.653)">
            <g transform="matrix(0.341228,0,0,0.341228,78.1794,116.993)">
              <path
                className="charge-path charge-path-1"
                d="M104.4,240L184,240C191.5,240 198.6,243.5 203.2,249.5C207.8,255.5 209.2,263.3 207.1,270.5L162.3,427.5L345.5,272L264,272C256.5,272 249.4,268.5 244.8,262.5C240.2,256.5 238.8,248.7 240.9,241.5L285.6,85L104.4,240Z"
              />
            </g>
            <g transform="matrix(0.341228,0,0,0.341228,78.1794,116.993)">
              <path
                className="charge-path charge-path-2"
                d="M104.4,240L184,240C191.5,240 198.6,243.5 203.2,249.5C207.8,255.5 209.2,263.3 207.1,270.5L162.3,427.5L345.5,272L264,272C256.5,272 249.4,268.5 244.8,262.5C240.2,256.5 238.8,248.7 240.9,241.5L285.6,85L104.4,240Z"
              />
            </g>
          </g>
          <g transform="matrix(1.57405,0,0,1.57405,-93.3438,-171.653)">
            <g transform="matrix(0.341228,0,0,0.341228,78.1794,116.993)">
              <path
                className="charge-path charge-path-3"
                d="M321.7,0C340.8,0 354.6,18.3 349.3,36.6L295.8,224L381,224C400.3,224 415.9,239.6 415.9,258.9C415.9,269.2 411.4,278.9 403.6,285.5L144.9,505.2C139.7,509.6 133.1,512 126.3,512C107.2,512 93.4,493.7 98.7,475.4L152.2,288L65.8,288C47.1,288 32,272.9 32,254.3C32,244.4 36.3,235.1 43.8,228.7L303.1,6.9C308.3,2.4 314.9,0 321.7,0ZM285.6,85L104.4,240L184,240C191.5,240 198.6,243.5 203.2,249.5C207.8,255.5 209.2,263.3 207.1,270.5L162.3,427.5L345.5,272L264,272C256.5,272 249.4,268.5 244.8,262.5C240.2,256.5 238.8,248.7 240.9,241.5L285.6,85Z"
              />
            </g>
            <g transform="matrix(0.341228,0,0,0.341228,78.1794,116.993)">
              <path
                className="charge-path charge-path-4"
                d="M321.7,0C340.8,0 354.6,18.3 349.3,36.6L295.8,224L381,224C400.3,224 415.9,239.6 415.9,258.9C415.9,269.2 411.4,278.9 403.6,285.5L144.9,505.2C139.7,509.6 133.1,512 126.3,512C107.2,512 93.4,493.7 98.7,475.4L152.2,288L65.8,288C47.1,288 32,272.9 32,254.3C32,244.4 36.3,235.1 43.8,228.7L303.1,6.9C308.3,2.4 314.9,0 321.7,0ZM285.6,85L104.4,240L184,240C191.5,240 198.6,243.5 203.2,249.5C207.8,255.5 209.2,263.3 207.1,270.5L162.3,427.5L345.5,272L264,272C256.5,272 249.4,268.5 244.8,262.5C240.2,256.5 238.8,248.7 240.9,241.5L285.6,85Z"
              />
            </g>
          </g>
        </svg>
      );
    case 'Paused':
    case 'SuspendedEV':
    case 'SuspendedEVSE':
      return <FontAwesomeIcon icon={faPause} className="text-8xl" />;
  }

  switch (connector.type) {
    case 'j1772':
      return <FontAwesomeIcon icon={faJ1772} className="text-8xl" />;
    case 'ccs1':
      return <FontAwesomeIcon icon={faCcs1} className="text-8xl" />;
    case 'nacs':
      return <FontAwesomeIcon icon={faNacs} className="text-8xl" />;
    default:
      return <FontAwesomeIcon icon={faPlug} className="text-8xl" />;
  }
};
